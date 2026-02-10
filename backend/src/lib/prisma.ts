import { PrismaClient } from '@prisma/client';

// ===================================
// Connection State & Mutex
// ===================================

let isReconnecting = false;
let reconnectPromise: Promise<void> | null = null;
let isConnected = false;
let lastConnectAttempt = 0;

// Minimum time between reconnection attempts (prevents storms)
const RECONNECT_COOLDOWN_MS = 5000;
const RECONNECT_PAUSE_MS = 2000;

// ===================================
// Connection Error Detection
// ===================================

const CONNECTION_ERROR_PATTERNS = [
  "Can't reach database",
  'Connection refused',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'socket hang up',
  'server closed the connection',
  'Server has closed the connection',
  'Client has already been disconnected',
  'prepared statement',
  'connection is not available',
  'Connection terminated unexpectedly',
  'Connection timed out',
  'connect ETIMEDOUT',
  'read ECONNRESET',
  'getaddrinfo ENOTFOUND',
  'unable to start a transaction',
  'Transaction API error',
  'invalid length of startup packet',
];

const CONNECTION_ERROR_NAMES = [
  'PrismaClientInitializationError',
  'PrismaClientRustPanicError',
];

const CONNECTION_ERROR_CODES = ['P1001', 'P1002', 'P1008', 'P1017'];

function isConnectionError(error: any): boolean {
  if (!error) return false;
  const name = error.name || '';
  const message = error.message || '';
  const code = error.code || '';
  if (CONNECTION_ERROR_NAMES.includes(name)) return true;
  if (CONNECTION_ERROR_CODES.includes(code)) return true;
  return CONNECTION_ERROR_PATTERNS.some(pattern => message.includes(pattern));
}

// ===================================
// Mutex-Based Reconnection
// ===================================

/**
 * Reconnect with mutex to prevent concurrent reconnection storms.
 * If already reconnecting, all callers wait for the same promise.
 */
async function reconnect(client: PrismaClient): Promise<void> {
  // If already reconnecting, wait for the existing attempt
  if (isReconnecting && reconnectPromise) {
    return reconnectPromise;
  }

  // Cooldown: don't retry too fast
  const now = Date.now();
  if (now - lastConnectAttempt < RECONNECT_COOLDOWN_MS) {
    const waitTime = RECONNECT_COOLDOWN_MS - (now - lastConnectAttempt);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  isReconnecting = true;
  lastConnectAttempt = Date.now();

  reconnectPromise = (async () => {
    try {
      console.log('🔄 Reconnecting to database...');
      try { await client.$disconnect(); } catch { /* ignore */ }
      await new Promise(resolve => setTimeout(resolve, RECONNECT_PAUSE_MS));
      await client.$connect();
      isConnected = true;
      console.log('✅ Database reconnected successfully');
    } catch (err) {
      isConnected = false;
      console.error('❌ Database reconnection failed:', err instanceof Error ? err.message.substring(0, 200) : err);
      throw err;
    } finally {
      isReconnecting = false;
      reconnectPromise = null;
    }
  })();

  return reconnectPromise;
}

// ===================================
// Prisma Client with Auto-Retry Middleware
// ===================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

  // Global query middleware: auto-retry on connection failure
  // Uses mutex to prevent concurrent reconnection storms
  client.$use(async (params, next) => {
    try {
      const result = await next(params);
      // If query succeeded, mark as connected
      if (!isConnected) isConnected = true;
      return result;
    } catch (error) {
      if (!isConnectionError(error)) {
        throw error; // Not a connection error, rethrow immediately
      }

      isConnected = false;
      const model = params.model || 'unknown';
      const action = params.action || 'unknown';
      console.warn(`⚠️ DB error on ${model}.${action}, will reconnect...`);

      try {
        // Use mutex-based reconnect (prevents storms)
        await reconnect(client);
        // Retry the original query
        console.log(`🔁 Retrying ${model}.${action}...`);
        return await next(params);
      } catch (retryError) {
        console.error(`❌ Retry failed for ${model}.${action}`);
        throw retryError;
      }
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ===================================
// Health Check Helper (no retry, no reconnect storms)
// ===================================

/**
 * Check if the database is reachable.
 * Does NOT trigger reconnection — just reports current state.
 */
export async function checkDbHealth(): Promise<{ connected: boolean; error?: string }> {
  // If we know we're disconnected and already reconnecting, just report status
  if (isReconnecting) {
    return { connected: false, error: 'Reconnecting...' };
  }

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    isConnected = true;
    return { connected: true };
  } catch (err) {
    isConnected = false;
    const msg = err instanceof Error ? err.message.substring(0, 200) : String(err);

    // Trigger reconnect in background (non-blocking, won't cascade)
    reconnect(prisma).catch(() => { /* handled inside reconnect */ });

    return { connected: false, error: msg };
  }
}

/**
 * Returns the cached connection state without making any DB call.
 */
export function isDbConnected(): boolean {
  return isConnected;
}

// ===================================
// Startup Connection with Retry
// ===================================

/**
 * Connect on startup with retry. Uses longer delays for Supabase pooler warmup.
 */
export const connectWithRetry = async (retries = 5, delay = 5000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        try { await prisma.$disconnect(); } catch { /* ignore */ }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await prisma.$connect();
      // Verify with a real query (bypasses $use middleware via $queryRawUnsafe)
      await prisma.$queryRawUnsafe('SELECT 1');
      isConnected = true;
      lastConnectAttempt = Date.now();
      console.log(`✅ Database connected (attempt ${attempt}/${retries})`);
      return;
    } catch (error) {
      isConnected = false;
      const msg = error instanceof Error ? error.message.substring(0, 150) : String(error);
      console.error(`❌ DB connect attempt ${attempt}/${retries}: ${msg}`);
      if (attempt < retries) {
        const waitTime = delay * attempt; // Progressive backoff
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  console.error('🚨 All startup connection attempts failed.');
  console.error('🚨 DATABASE_URL set:', !!process.env.DATABASE_URL);
  console.error('🚨 URL prefix:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 40) + '...' : 'NOT SET');
};

export default prisma;
