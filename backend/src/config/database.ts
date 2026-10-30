import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    await ensureAnalysisHistoryTable();
  } catch (error) {
    console.warn('⚠️ Database connection failed (server continuing):', (error as Error).message || error);
  }
}

/**
 * Idempotent init for the analysis_history table. The canonical migration
 * path remains `npm run db:push` (see docs/deployment.md); this guard makes
 * the table appear automatically on environments (e.g. Render) where the
 * service starts before anyone runs db push. All statements are
 * IF NOT EXISTS, so a later db push is a no-op.
 */
async function ensureAnalysisHistoryTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "analysis_history" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "hsCode" TEXT,
        "productName" TEXT,
        "analysisType" TEXT NOT NULL,
        "resultJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "analysis_history_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "analysis_history_userId_createdAt_idx" ON "analysis_history"("userId", "createdAt")',
    );
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysis_history_userId_fkey') THEN
          ALTER TABLE "analysis_history"
            ADD CONSTRAINT "analysis_history_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$
    `);
  } catch (error) {
    console.warn('⚠️ analysis_history init skipped:', (error as Error).message || error);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
