/**
 * Rotas HTTP — health, status, trigger e Dashboard API (Fase 1 + 2).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { JobRunRepository } from '../repositories/job-run.repository.js';
import { OfferRepository } from '../repositories/offer.repository.js';
import { EvolutionMessageService } from '../services/evolution/index.js';
import { DashboardService } from '../services/dashboard/dashboard.service.js';
import { AuthService } from '../services/auth/auth.service.js';
import { TemplateService } from '../services/templates/template.service.js';
import type { OffersCronJob } from '../cron/offers.cron.js';
import {
  requireAuth,
  requireWriteAccess,
  requireAdmin,
  type AuthedRequest,
} from '../middleware/auth.middleware.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const conditionSchema = z.object({
  field: z.enum(['discount', 'rating', 'commission', 'sales', 'price']),
  op: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  value: z.coerce.number(),
});

/** Express 5 tipa params como string | string[] */
function paramId(req: Request, name = 'id'): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0]! : value!;
}

export function createRoutes(cronJob: OffersCronJob): Router {
  const router = Router();
  const offerRepository = new OfferRepository();
  const jobRunRepository = new JobRunRepository();
  const evolutionService = new EvolutionMessageService();
  const dashboard = new DashboardService();
  const authService = new AuthService();
  const templateService = new TemplateService();

  /** Libera health/status/login; o resto de /api e /offers/run exige JWT se AUTH_ENABLED */
  router.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    if (path === '/health' || path === '/status' || path === '/') {
      next();
      return;
    }
    if (path === '/api/auth/login') {
      next();
      return;
    }
    if (path.startsWith('/api') || path === '/offers/run') {
      requireAuth(req, res, next);
      return;
    }
    next();
  });

  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const evolutionState = await evolutionService.getStatus();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'up',
        evolution: evolutionState,
        phase: 2,
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

  router.post(
    '/offers/run',
    requireAuth,
    requireWriteAccess,
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        logger.info('Trigger manual do pipeline via HTTP');
        const result = await cronJob.runNow();
        res.status(202).json({ message: 'Pipeline executado', result });
      } catch (error) {
        next(error);
      }
    },
  );

  // Auth
  router.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          email: z.string().email(),
          password: z.string().min(1),
        })
        .parse(req.body);
      res.json(await authService.login(body.email, body.password));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/users', requireAuth, requireAdmin, async (_req, res, next) => {
    try {
      res.json(await authService.listUsers());
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/users', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          email: z.string().email(),
          password: z.string().min(6),
          role: z.enum(['admin', 'manager', 'operator', 'influencer']).optional(),
        })
        .parse(req.body);
      const user = await authService.createUser(body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  // Templates
  router.get('/api/templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;
      res.json(await templateService.list(channel));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/api/templates',
    requireAuth,
    requireWriteAccess,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const body = z
          .object({
            name: z.string().min(1),
            channel: z.enum(['whatsapp', 'telegram', 'instagram', 'facebook', 'twitter']).optional(),
            body: z.string().min(1),
            isDefault: z.boolean().optional(),
          })
          .parse(req.body);
        const tpl = await templateService.create({
          ...body,
          createdById: req.user?.id,
        });
        res.status(201).json(tpl);
      } catch (error) {
        next(error);
      }
    },
  );

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

  router.get('/api/products/:id/prices', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await dashboard.getProductPriceHistory(paramId(req));
      if (!data) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Produto não encontrado' });
        return;
      }
      res.json(data);
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

  router.post('/api/groups', requireAuth, requireWriteAccess, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          groupJid: z.string().min(1),
          categories: z.array(z.string()).optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      res.status(201).json(await dashboard.createGroup(body));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/api/groups/:id', requireAuth, requireWriteAccess, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          isActive: z.boolean().optional(),
          name: z.string().min(1).optional(),
          categories: z.array(z.string()).optional(),
        })
        .parse(req.body);
      res.json(await dashboard.updateGroup(paramId(req), body));
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

  router.post('/api/campaigns', requireAuth, requireWriteAccess, async (req: Request, res: Response, next: NextFunction) => {
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
      res.status(201).json(await dashboard.createCampaign(body));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/automations', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await dashboard.listAutomations());
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/automations', requireAuth, requireWriteAccess, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          logic: z.enum(['and', 'or']).optional(),
          conditions: z.array(conditionSchema).min(1),
          action: z.enum(['send_whatsapp', 'skip', 'boost']).optional(),
          groupId: z.string().optional(),
          priority: z.coerce.number().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      res.status(201).json(await dashboard.createAutomation(body));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/api/automations/:id', requireAuth, requireWriteAccess, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          isActive: z.boolean().optional(),
          name: z.string().min(1).optional(),
          priority: z.coerce.number().optional(),
        })
        .parse(req.body);
      res.json(await dashboard.updateAutomation(paramId(req), body));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/schedule', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .parse(req.query);
      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(query.to) : undefined;
      res.json(await dashboard.listScheduledPosts(from, to));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/schedule', requireAuth, requireWriteAccess, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          title: z.string().min(1),
          scheduledAt: z.string().min(1),
          productId: z.string().optional(),
          groupId: z.string().optional(),
          messageText: z.string().optional(),
          imageUrl: z.string().optional(),
          offerLink: z.string().optional(),
        })
        .parse(req.body);
      res.status(201).json(await dashboard.createScheduledPost(body));
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
