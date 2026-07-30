/**
 * Rotas HTTP — health, status, trigger e Dashboard API (Fase 1).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { JobRunRepository } from '../repositories/job-run.repository.js';
import { OfferRepository } from '../repositories/offer.repository.js';
import { EvolutionMessageService } from '../services/evolution/index.js';
import { DashboardService } from '../services/dashboard/dashboard.service.js';
import type { OffersCronJob } from '../cron/offers.cron.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function createRoutes(cronJob: OffersCronJob): Router {
  const router = Router();
  const offerRepository = new OfferRepository();
  const jobRunRepository = new JobRunRepository();
  const evolutionService = new EvolutionMessageService();
  const dashboard = new DashboardService();

  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const evolutionState = await evolutionService.getStatus();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'up',
        evolution: evolutionState,
        phase: 1,
      });
    } catch (error) {
      next(error);
    }
  });

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

  router.post('/offers/run', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('Trigger manual do pipeline via HTTP');
      const result = await cronJob.runNow();
      res.status(202).json({ message: 'Pipeline executado', result });
    } catch (error) {
      next(error);
    }
  });

  // ----- Dashboard API (Fase 1) -----

  router.get('/api/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await dashboard.getOverview());
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/products', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = z
        .object({
          q: z.string().optional(),
          minCommission: z.coerce.number().optional(),
          minRating: z.coerce.number().optional(),
          minSales: z.coerce.number().optional(),
          minDiscount: z.coerce.number().optional(),
          page: z.coerce.number().optional(),
          limit: z.coerce.number().optional(),
        })
        .parse(req.query);

      res.json(await dashboard.listProducts(query));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/groups', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await dashboard.listGroups());
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/groups', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          groupJid: z.string().min(1),
          categories: z.array(z.string()).optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);

      const group = await dashboard.createGroup(body);
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/campaigns', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await dashboard.listCampaigns());
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/campaigns', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          startsAt: z.string().min(1),
          endsAt: z.string().min(1),
          commissionGoal: z.coerce.number().optional(),
          groupId: z.string().optional(),
          channelId: z.string().optional(),
        })
        .parse(req.body);

      const campaign = await dashboard.createCampaign(body);
      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.issues.map((i) => i.message).join('; '),
    });
    return;
  }

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
