import { Prisma, PrismaClient } from '@prisma/client';
import { Logger } from '../observability/logger';
import { env } from '../env';

const prismaClientPropertyName = `__prisma`;

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global[prismaClientPropertyName] ||
  new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'stdout',
        level: 'info',
      },
      {
        emit: 'stdout',
        level: 'warn',
      },
    ],
  });

if (env.NODE_ENV === 'development') {
  global[prismaClientPropertyName] = prisma;
}

// Log queries in development if debugging is on
if (env.NODE_ENV === 'development') {
  (prisma as any).$on('query', (e: any) => {
    Logger.debug(`Query: ${e.query}`);
    Logger.debug(`Params: ${e.params}`);
    Logger.debug(`Duration: ${e.duration}ms`);
  });
}

(prisma as any).$on('error', (e: any) => {
  Logger.error('Prisma Error', new Error(e.message), { target: e.target });
});

