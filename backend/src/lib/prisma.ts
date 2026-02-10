import { PrismaClient } from '@prisma/client';

// ===================================
// Supabase PgBouncer Auto-Configuration
// ===================================

/**
 * Auto-append pgbouncer=true & connection_limit=1 to DATABASE_URL
 * when using Supabase's connection pooler (port 6543).
 * This MUST run before PrismaClient is created.
 */
function ensurePoolerParams(): void {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  // Detect Supabase pooler (port 6543 or pooler.supabase.com)
  if (url.includes('pooler.supabase.com') || url.includes(':6543')) {
    const separator = url.includes('?') ? '&' : '?';
    const params: string[] = [];
    if (!url.includes('pgbouncer=')) params.push('pgbouncer=true');
    if (!url.includes('connection_limit=')) params.push('connection_limit=1');
    if (!url.includes('pool_timeout=')) params.push('pool_timeout=20');
    if (!url.includes('connect_timeout=')) params.push('connect_timeout=15');
    if (params.length > 0) {
      process.env.DATABASE_URL = url + separator + params.join('&');
      console.log('🔧 Auto-added PgBouncer params to DATABASE_URL');
    }
  }
}

// Must run before PrismaClient instantiation
ensurePoolerParams();

// ===================================
// Connection State & Mutex
// ===================================

let isReconnecting = false;
let reconnectPromise: Promise<void> | null = null;
let isConnected = false;
let lastConnectAttempt = 0;
let lastHealthProbe = 0;

// Flag to bypass $use middleware (used by health check)
let bypassMiddleware = false;

// Minimum time between reconnection attempts (30s prevents storms from health checks)
const RECONNECT_COOLDOWN_MS = 30000;
const RECONNECT_PAUSE_MS = 2000;
// Minimum time between health check DB probes (60s)
const HEALTH_PROBE_INTERVAL_MS = 60000;

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
  'Timed out fetching a new connection from the connection pool',
  'connection pool',
];

const CONNECTION_ERROR_NAMES = [
  'PrismaClientInitializationError',
  'PrismaClientRustPanicError',
];

const CONNECTION_ERROR_CODES = ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'];

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
 * 30s cooldown between attempts.
 */
async function reconnect(client: PrismaClient): Promise<void> {
  // If already reconnecting, wait for the existing attempt
  if (isReconnecting && reconnectPromise) {
    return reconnectPromise;
  }

  // Cooldown: don't retry if we attempted recently
  const now = Date.now();
  if (now - lastConnectAttempt < RECONNECT_COOLDOWN_MS) {
    throw new Error(`Reconnect cooldown active (${Math.round((RECONNECT_COOLDOWN_MS - (now - lastConnectAttempt)) / 1000)}s remaining)`);
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
    // Bypass flag: health check probes skip retry logic entirely
    if (bypassMiddleware) {
      return next(params);
    }

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
        // Use mutex-based reconnect (prevents storms, 30s cooldown)
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
// Health Check Helper (non-cascading)
// ===================================

/**
 * Check if the database is reachable.
 * - Uses `bypassMiddleware` flag so $queryRawUnsafe does NOT trigger
 *   the $use() retry/reconnect logic (prevents health check storms).
 * - Probes DB at most once per 60s.
 * - When DB is down and a reconnect was tried recently, returns cached state.
 * - NEVER triggers reconnection storms.
 */
export async function checkDbHealth(): Promise<{ connected: boolean; error?: string }> {
  // If currently reconnecting, just report status
  if (isReconnecting) {
    return { connected: false, error: 'Reconnecting...' };
  }

  const now = Date.now();

  // If connected and recently probed (<60s), trust cached state
  if (isConnected && (now - lastHealthProbe) < HEALTH_PROBE_INTERVAL_MS) {
    return { connected: true };
  }

  // If NOT connected and a reconnect was attempted recently (<30s), don't probe again
  if (!isConnected && (now - lastConnectAttempt) < RECONNECT_COOLDOWN_MS) {
    return { connected: false, error: 'Database unreachable (cooldown active)' };
  }

  // Actually probe the database, but bypass $use middleware to avoid storm
  lastHealthProbe = now;
  bypassMiddleware = true;
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    isConnected = true;
    return { connected: true };
  } catch (err) {
    isConnected = false;
    const msg = err instanceof Error ? err.message.substring(0, 200) : String(err);

    // Trigger ONE reconnect in background (non-blocking) — cooldown prevents repeats
    reconnect(prisma).catch(() => { /* handled inside reconnect */ });

    return { connected: false, error: msg };
  } finally {
    bypassMiddleware = false;
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
      // Verify with a real query (bypasses $use middleware)
      bypassMiddleware = true;
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
      } finally {
        bypassMiddleware = false;
      }
      isConnected = true;
      lastConnectAttempt = Date.now();
      lastHealthProbe = Date.now();
      console.log(`✅ Database connected (attempt ${attempt}/${retries})`);
      return;
    } catch (error) {
      bypassMiddleware = false;
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
