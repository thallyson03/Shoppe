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
      version: '2.0.0',
      phase: 2,
      description: 'Plataforma afiliados Shopee → WhatsApp (Fase 2)',
      endpoints: {
        health: 'GET /health',
        status: 'GET /status',
        run: 'POST /offers/run',
        login: 'POST /api/auth/login',
        users: 'GET|POST /api/users',
        templates: 'GET|POST /api/templates',
        dashboard: 'GET /api/dashboard',
        products: 'GET /api/products',
        productPrices: 'GET /api/products/:id/prices',
        groups: 'GET|POST|PATCH /api/groups',
        campaigns: 'GET|POST /api/campaigns',
        automations: 'GET|POST|PATCH /api/automations',
        schedule: 'GET|POST /api/schedule',
      },
    });
  });

  app.use(createRoutes(cronJob));
  app.use(errorHandler);

  return { app, cronJob };
}
