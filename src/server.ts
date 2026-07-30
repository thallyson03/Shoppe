/**
 * Entry point — sobe HTTP + conecta ao banco + inicia o cron.
 */

import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';
import { seedPhase1Defaults } from './database/seed-phase1.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  logger.info(
    { env: env.NODE_ENV, port: env.PORT, cron: env.CRON_SCHEDULE, phase: 1 },
    'Iniciando shopee-offers',
  );

  await connectDatabase();
  logger.info('PostgreSQL conectado');

  await seedPhase1Defaults();

  const { app, cronJob } = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`HTTP listening on :${env.PORT}`);
  });

  cronJob.start();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Encerrando aplicação...');
    cronJob.stop();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    await disconnectDatabase();
    logger.info('Shutdown completo');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled Rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught Exception');
    void shutdown('uncaughtException');
  });
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Falha fatal na inicialização');
  process.exit(1);
});
