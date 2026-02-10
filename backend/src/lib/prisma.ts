import { PrismaClient } from '@prisma/client';

// ===================================
// Connection Error Detection
// ===================================

const CONNECTION_ERROR_PATTERNS = [
  'Can\'t reach database',
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

// Prisma error codes for connection issues
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
// Prisma Client Factory with Auto-Retry
// ===================================

// Prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    // DO NOT set datasourceUrl - let schema.prisma env("DATABASE_URL") handle it
  });

  // ===================================
  // Query Middleware: Auto-retry on connection failure
  // This intercepts ALL Prisma queries globally, so no route changes needed.
  // ===================================
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      if (isConnectionError(error)) {
        const model = params.model || 'unknown';
        const action = params.action || 'unknown';
        console.warn(`⚠️ DB connection error on ${model}.${action}, reconnecting...`);
        console.warn(`   Error: ${error instanceof Error ? error.message.substring(0, 200) : error}`);
        
        // Force disconnect to kill stale connection pool
        try { await client.$disconnect(); } catch { /* ignore */ }
        
        // Brief pause for connection cleanup
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Reconnect
        try {
          await client.$connect();
          console.log(`✅ DB reconnected, retrying ${model}.${action}...`);
          // Retry the original query
          return await next(params);
        } catch (retryError) {
          console.error(`❌ Retry failed for ${model}.${action}:`, retryError instanceof Error ? retryError.message.substring(0, 200) : retryError);
          throw retryError;
        }
      }
      // Not a connection error — rethrow as-is
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
// Startup Connection with Retry
// ===================================

/**
 * Connect to the database with retry logic.
 * Useful for cold starts on Render free tier where DB connection may be stale.
 */
export const connectWithRetry = async (retries = 3, delay = 3000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        try { await prisma.$disconnect(); } catch { /* ignore */ }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await prisma.$connect();
      // Verify with a real query
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✅ Database connected successfully (attempt ${attempt})`);
      return;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Database connection attempt ${attempt}/${retries} failed: ${msg}`);
      if (attempt === retries) {
        console.error('🚨 All database connection attempts failed.');
        console.error('🚨 DATABASE_URL set:', !!process.env.DATABASE_URL);
        console.error('🚨 DATABASE_URL prefix:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET');
        return;
      }
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// ===================================
// Manual Retry Wrapper (for non-Prisma-model operations like $queryRaw)
// ===================================

export async function withDbRetry<T>(operation: () => Promise<T>, operationName = 'DB operation'): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }
    
    console.warn(`⚠️ ${operationName} failed, attempting reconnect...`);
    try { await prisma.$disconnect(); } catch { /* ignore */ }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      await prisma.$connect();
      return await operation();
    } catch (retryError) {
      console.error(`❌ ${operationName} retry failed:`, retryError instanceof Error ? retryError.message : retryError);
      throw retryError;
    }
  }
}

export default prisma;
