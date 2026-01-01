/**
 * Prisma Client Singleton
 *
 * Creates a single Prisma client instance for the entire application.
 * In development, we attach it to globalThis to prevent multiple instances
 * during hot module replacement.
 */

import { PrismaClient } from '@/generated/prisma';

// Type declaration for Prisma singleton on globalThis
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
