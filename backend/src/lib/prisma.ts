import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  // Connection pool settings optimized for Render free tier + Supabase
  datasourceUrl: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect to the database with retry logic.
 * Useful for cold starts on Render free tier where DB connection may be stale.
 * Key: disconnect first to kill any stale/dead connections in the pool.
 */
export const connectWithRetry = async (retries = 3, delay = 3000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Force disconnect first to clear any stale connections
      if (attempt > 1) {
        try {
          await prisma.$disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : error);
      if (attempt === retries) {
        console.error('🚨 All database connection attempts failed. Server may not function properly.');
        return;
      }
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Force reconnect - disconnect then connect.
 * Used for per-request retry when a query fails due to stale connection.
 */
export const forceReconnect = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect errors
  }
  await prisma.$connect();
};

export default prisma;
