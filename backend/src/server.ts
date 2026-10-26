import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import { researchJobWorker } from './modules/market/researchJob.worker';

const startServer = async () => {
  await connectDatabase();

  // ─── Start Background Research Job Worker ─────────────────────
  researchJobWorker.start();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`
╔══════════════════════════════════════════════════════╗
║           🌍  GlobeX AI — Backend Running            ║
╠══════════════════════════════════════════════════════╣
║  Environment : ${env.NODE_ENV.padEnd(36)}║
║  Port        : ${String(env.PORT).padEnd(36)}║
║  API Base    : http://localhost:${env.PORT}/api/${env.API_VERSION.padEnd(14)}║
║  API Docs    : http://localhost:${env.PORT}/api-docs${' '.repeat(15)}║
║  Health      : http://localhost:${env.PORT}/health${' '.repeat(17)}║
╚══════════════════════════════════════════════════════╝
    `);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    researchJobWorker.stop();
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed. Goodbye.');
      process.exit(0);
    });

    // Force kill if not done in 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
};

startServer();
