import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  // DO NOT set datasourceUrl here - let schema.prisma env("DATABASE_URL") handle it
  // Setting it here can cause undefined URL if module loads before env vars
});

export let prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect to the database with retry logic.
 * Useful for cold starts on Render free tier where DB connection may be stale.
 * On each retry: disconnect (kill stale pool) -> wait -> reconnect.
 */
export const connectWithRetry = async (retries = 3, delay = 3000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // On retries, disconnect first to clear stale connections
      if (attempt > 1) {
        try { await prisma.$disconnect(); } catch { /* ignore */ }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await prisma.$connect();
      // Verify with a simple query
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

/**
 * Execute a database operation with automatic retry on connection failure.
 * Handles stale connections from Render free tier sleep/wake cycles.
 */
export async function withDbRetry<T>(operation: () => Promise<T>, operationName = 'DB operation'): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isConnectionError = 
      msg.includes('connect') ||
      msg.includes('Connection') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ECONNRESET') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('socket') ||
      msg.includes('prepared statement') ||
      msg.includes('server closed') ||
      msg.includes("Can't reach database") ||
      msg.includes('timed out') ||
      msg.includes('Server has closed the connection') ||
      msg.includes('Client has already been disconnected');
    
    if (!isConnectionError) {
      throw error; // Not a connection error, rethrow immediately
    }
    
    console.warn(`⚠️ ${operationName} failed (${msg}), attempting reconnect...`);
    
    // Force reconnect: disconnect -> pause -> connect
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
