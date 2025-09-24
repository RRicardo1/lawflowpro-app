import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export const connectToDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('📦 Successfully connected to database');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

export const disconnectFromDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('📦 Successfully disconnected from database');
  } catch (error) {
    logger.error('❌ Failed to disconnect from database:', error);
  }
};

process.on('beforeExit', async () => {
  await disconnectFromDatabase();
});