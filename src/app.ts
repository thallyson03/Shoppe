/**
 * Aplicação Express — middlewares, rotas e composição de dependências.
 */

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { OffersCronJob } from './cron/offers.cron.js';
import { createRoutes, errorHandler } from './routes/index.js';

export interface AppContext {
  app: Express;
  cronJob: OffersCronJob;
}

export function createApp(): AppContext {
  const app = express();
  const cronJob = new OffersCronJob();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.json({
      name: 'shopee-offers',
      version: '1.1.0',
      phase: 1,
      description: 'Plataforma afiliados Shopee → WhatsApp (Fase 1)',
      endpoints: {
        health: 'GET /health',
        status: 'GET /status',
        run: 'POST /offers/run',
        dashboard: 'GET /api/dashboard',
        products: 'GET /api/products',
        groups: 'GET|POST /api/groups',
        campaigns: 'GET|POST /api/campaigns',
      },
    });
  });

  app.use(createRoutes(cronJob));
  app.use(errorHandler);

  return { app, cronJob };
}
