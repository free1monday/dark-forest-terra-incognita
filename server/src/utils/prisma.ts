import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton — critical on serverless (Vercel) to avoid exhausting DB connections.
 * In dev, reuse globalThis so HMR / tsx watch doesn't spawn a new pool each reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
