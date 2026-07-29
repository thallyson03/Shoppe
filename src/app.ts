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
      version: '1.0.0',
      description: 'Monitor de ofertas Shopee → WhatsApp (Evolution API)',
      endpoints: {
        health: 'GET /health',
        status: 'GET /status',
        run: 'POST /offers/run',
      },
    });
  });

  app.use(createRoutes(cronJob));
  app.use(errorHandler);

  return { app, cronJob };
}
