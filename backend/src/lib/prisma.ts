import { PrismaClient } from '@prisma/client';

// ===================================
// Supabase PgBouncer Auto-Configuration for Render (Long-Running Server)
// ===================================

/**
 * Auto-append PgBouncer and TCP keep-alive parameters to DATABASE_URL
 * when using Supabase's connection pooler (port 6543).
 * 
 * For Render (long-running servers), we need:
 * - TCP keep-alive to prevent idle connection drops
 * - Smaller connection limit to not exhaust Supabase's pool
 * - Longer timeouts to handle network latency
 * 
 * This MUST run before PrismaClient is created.
 */
function ensurePoolerParams(): void {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  // Detect Supabase pooler (port 6543 or pooler.supabase.com)
  if (url.includes('pooler.supabase.com') || url.includes(':6543')) {
    const separator = url.includes('?') ? '&' : '?';
    const params: string[] = [];
    
    // PgBouncer mode flag
    if (!url.includes('pgbouncer=')) params.push('pgbouncer=true');
    
    // Connection pool settings:
    // - connection_limit=3: Supabase free tier has ~15-20 pooled connections.
    //   Keep Prisma's internal pool SMALL so we don't exhaust Supabase's global limit.
    // - Using 3 (not 1) allows some concurrency without hogging the pool.
    if (!url.includes('connection_limit=')) params.push('connection_limit=3');
    
    // Timeout settings (generous for cross-region network latency):
    if (!url.includes('pool_timeout=')) params.push('pool_timeout=30');
    if (!url.includes('connect_timeout=')) params.push('connect_timeout=30');
    
    // PgBouncer transaction mode doesn't support prepared statements
    if (!url.includes('statement_cache_size=')) params.push('statement_cache_size=0');
    
    // TCP Keep-Alive settings to prevent idle connection drops:
    // These are CRITICAL for Render's long-running servers.
    // Supabase's pooler may close idle connections; keep-alive prevents this.
    if (!url.includes('keepalives=')) params.push('keepalives=1');
    if (!url.includes('keepalives_idle=')) params.push('keepalives_idle=30');
    if (!url.includes('keepalives_interval=')) params.push('keepalives_interval=10');
    if (!url.includes('keepalives_count=')) params.push('keepalives_count=3');
    
    if (params.length > 0) {
      process.env.DATABASE_URL = url + separator + params.join('&');
      console.log('🔧 Auto-added PgBouncer + TCP keep-alive params to DATABASE_URL');
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
let lastSuccessfulQuery = 0;
let keepAliveInterval: NodeJS.Timeout | null = null;

// Flag to bypass $use middleware (used by health check and keep-alive)
let bypassMiddleware = false;

// Timing constants tuned for Render + Supabase:
// - Shorter cooldown (20s) since Supabase connection drops are usually transient
// - Keep-alive ping every 25s to prevent idle connection closure
const RECONNECT_COOLDOWN_MS = 20000;
const RECONNECT_PAUSE_MS = 2000;
const HEALTH_PROBE_INTERVAL_MS = 300000;
const RECENT_ACTIVITY_MS = 60000;
const KEEP_ALIVE_INTERVAL_MS = 25000;

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
    const remaining = Math.round((RECONNECT_COOLDOWN_MS - (now - lastConnectAttempt)) / 1000);
    console.log(`⏳ Reconnect cooldown active (${remaining}s remaining)`);
    throw new Error(`Reconnect cooldown active (${remaining}s remaining)`);
  }

  isReconnecting = true;
  lastConnectAttempt = Date.now();

  reconnectPromise = (async () => {
    try {
      console.log('🔄 Reconnecting to database...');
      // Do NOT call $disconnect() — it destroys all active connections in the pool,
      // killing any in-flight queries from other requests. Instead, just try to connect.
      // Prisma will recycle stale connections internally.
      await new Promise(resolve => setTimeout(resolve, RECONNECT_PAUSE_MS));
      
      // Try a lightweight query to test connectivity
      bypassMiddleware = true;
      try {
        await client.$queryRawUnsafe('SELECT 1');
        isConnected = true;
        lastSuccessfulQuery = Date.now();
        console.log('✅ Database reconnected successfully');
      } finally {
        bypassMiddleware = false;
      }
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
      // If query succeeded, mark as connected and track time
      isConnected = true;
      lastSuccessfulQuery = Date.now();
      return result;
    } catch (error) {
      if (!isConnectionError(error)) {
        throw error; // Not a connection error, rethrow immediately
      }

      isConnected = false;
      const model = params.model || 'unknown';
      const action = params.action || 'unknown';
      console.warn(`⚠️ DB error on ${model}.${action}: ${(error as Error).message?.substring(0, 100)}`);

      // Schedule reconnect in background but DON'T wait for it —
      // fail fast to the caller so the HTTP request doesn't hang.
      reconnect(client).catch(() => { /* handled inside reconnect */ });
      
      // Rethrow original error — let errorHandler.ts return a proper 503
      throw error;
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
  // LIGHTWEIGHT: Health checks should NEVER open new DB connections.
  // Render sends health checks every 5s from MULTIPLE IPs — if each one
  // probes the DB, we exhaust Supabase's limited connection pool.
  //
  // Strategy:
  //   1. If a real user query succeeded recently, trust that → connected
  //   2. If we're reconnecting, report that
  //   3. Only probe DB if no activity for a long time AND not in cooldown

  const now = Date.now();

  // If a real query succeeded recently, DB is definitely up
  if (isConnected && (now - lastSuccessfulQuery) < RECENT_ACTIVITY_MS) {
    return { connected: true };
  }

  // If currently reconnecting, report status without touching DB
  if (isReconnecting) {
    return { connected: false, error: 'Reconnecting...' };
  }

  // If connected and recently probed, trust cached state
  if (isConnected && (now - lastHealthProbe) < HEALTH_PROBE_INTERVAL_MS) {
    return { connected: true };
  }

  // If NOT connected and a reconnect was attempted recently, don't probe
  if (!isConnected && (now - lastConnectAttempt) < RECONNECT_COOLDOWN_MS) {
    return { connected: false, error: 'Database unreachable (cooldown active)' };
  }

  // Only probe DB if there has been NO activity for a long time
  // This is rare — only happens if server has been idle for 5+ minutes
  lastHealthProbe = now;
  bypassMiddleware = true;
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    isConnected = true;
    lastSuccessfulQuery = now;
    return { connected: true };
  } catch (err) {
    isConnected = false;
    const msg = err instanceof Error ? err.message.substring(0, 200) : String(err);

    // Trigger ONE reconnect in background (non-blocking)
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
// Keep-Alive Ping (Critical for Render + Supabase)
// ===================================

/**
 * Periodic ping to keep database connections warm.
 * Supabase's PgBouncer may close idle connections; this prevents that.
 * Only pings if no recent query activity (to avoid unnecessary load).
 */
async function keepAlivePing(): Promise<void> {
  // Skip if a reconnect is in progress or recent query activity
  if (isReconnecting) return;
  if (Date.now() - lastSuccessfulQuery < KEEP_ALIVE_INTERVAL_MS) return;

  bypassMiddleware = true;
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    lastSuccessfulQuery = Date.now();
    if (!isConnected) {
      isConnected = true;
      console.log('💓 Keep-alive: Connection restored');
    }
  } catch (err) {
    // Don't spam logs — just mark as disconnected
    if (isConnected) {
      isConnected = false;
      console.warn('💔 Keep-alive: Connection lost, will reconnect on next request');
    }
  } finally {
    bypassMiddleware = false;
  }
}

/**
 * Start the keep-alive interval. Call this after successful connection.
 */
function startKeepAlive(): void {
  if (keepAliveInterval) return; // Already running
  
  keepAliveInterval = setInterval(keepAlivePing, KEEP_ALIVE_INTERVAL_MS);
  console.log(`💓 Keep-alive started (every ${KEEP_ALIVE_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop the keep-alive interval (for graceful shutdown).
 */
export function stopKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('💓 Keep-alive stopped');
  }
}

// ===================================
// Startup Connection with Retry
// ===================================

/**
 * Connect on startup with retry. Uses longer delays for Supabase pooler warmup.
 * Starts keep-alive ping after successful connection.
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
      lastSuccessfulQuery = Date.now();
      console.log(`✅ Database connected (attempt ${attempt}/${retries})`);
      
      // Start keep-alive ping to prevent idle connection closure
      startKeepAlive();
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
  
  // Even if initial connection fails, start keep-alive to attempt recovery
  startKeepAlive();
};

export default prisma;
