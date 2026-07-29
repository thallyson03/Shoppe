/**
 * Rotas HTTP — health check, status e trigger manual do pipeline.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../database/prisma.js';
import { JobRunRepository } from '../repositories/job-run.repository.js';
import { OfferRepository } from '../repositories/offer.repository.js';
import { EvolutionMessageService } from '../services/evolution/index.js';
import type { OffersCronJob } from '../cron/offers.cron.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function createRoutes(cronJob: OffersCronJob): Router {
  const router = Router();
  const offerRepository = new OfferRepository();
  const jobRunRepository = new JobRunRepository();
  const evolutionService = new EvolutionMessageService();

  /** Health check para Docker / load balancer */
  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const evolutionState = await evolutionService.getStatus();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'up',
        evolution: evolutionState,
      });
    } catch (error) {
      next(error);
    }
  });

  /** Métricas resumidas */
  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [totalOffers, published, unpublished, recentJobs] = await Promise.all([
        offerRepository.count(),
        offerRepository.count({ published: true }),
        offerRepository.count({ published: false }),
        jobRunRepository.findRecent(5),
      ]);

      res.json({
        offers: { total: totalOffers, published, unpublished },
        recentJobs,
      });
    } catch (error) {
      next(error);
    }
  });

  /** Dispara um ciclo manualmente (útil em homologação) */
  router.post('/offers/run', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('Trigger manual do pipeline via HTTP');
      const result = await cronJob.runNow();
      res.status(202).json({ message: 'Pipeline executado', result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/** Middleware global de erros */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, err.message);
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  logger.error({ err }, 'Erro não tratado');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor',
  });
}
