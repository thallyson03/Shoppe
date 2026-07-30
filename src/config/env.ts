/**
 * Configuração centralizada da aplicação.
 * Valida variáveis de ambiente com Zod na inicialização (fail-fast).
 */

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  SHOPEE_APP_ID: z.string().min(1, 'SHOPEE_APP_ID é obrigatório'),
  SHOPEE_SECRET: z.string().min(1, 'SHOPEE_SECRET é obrigatório'),
  SHOPEE_GRAPHQL_URL: z
    .string()
    .url()
    .default('https://open-api.affiliate.shopee.com.br/graphql'),
  SHOPEE_KEYWORD: z.string().optional().default(''),
  SHOPEE_LIST_TYPE: z.coerce.number().int().min(0).max(2).default(0),
  SHOPEE_SORT_TYPE: z.coerce.number().int().min(1).max(5).default(2),
  SHOPEE_PAGE_LIMIT: z.coerce.number().int().min(1).max(50).default(20),

  FILTER_MIN_COMMISSION_RATE: z.coerce.number().min(0).max(1).default(0.03),
  FILTER_MIN_DISCOUNT_RATE: z.coerce.number().min(0).max(100).default(10),
  FILTER_MIN_RATING: z.coerce.number().min(0).max(5).default(4),
  FILTER_MIN_SALES: z.coerce.number().int().min(0).default(50),
  /** Por ciclo: quantas candidatas salvar na fila */
  FILTER_MAX_SAVE_PER_RUN: z.coerce.number().int().min(1).max(50).default(10),
  /** Por ciclo: quantas publicar no WhatsApp (respeita 1/min) */
  FILTER_MAX_OFFERS_PER_RUN: z.coerce.number().int().min(1).max(20).default(1),

  /** Limites de publicação (anti-spam) */
  PUBLISH_MAX_PER_DAY: z.coerce.number().int().min(1).max(500).default(50),
  PUBLISH_MIN_INTERVAL_MS: z.coerce.number().int().min(0).default(60_000),
  PUBLISH_TIMEZONE: z.string().default('America/Sao_Paulo'),
  PUBLISH_MORNING_START: z.coerce.number().int().min(0).max(23).default(7),
  PUBLISH_AFTERNOON_START: z.coerce.number().int().min(0).max(23).default(12),
  PUBLISH_NIGHT_START: z.coerce.number().int().min(0).max(23).default(18),
  PUBLISH_NIGHT_END: z.coerce.number().int().min(1).max(24).default(23),
  PUBLISH_MORNING_LIMIT: z.coerce.number().int().min(0).max(500).default(17),
  PUBLISH_AFTERNOON_LIMIT: z.coerce.number().int().min(0).max(500).default(17),
  PUBLISH_NIGHT_LIMIT: z.coerce.number().int().min(0).max(500).default(16),

  EVOLUTION_API_URL: z.string().url('EVOLUTION_API_URL inválida'),
  EVOLUTION_API_KEY: z.string().min(1, 'EVOLUTION_API_KEY é obrigatória'),
  EVOLUTION_INSTANCE: z.string().min(1, 'EVOLUTION_INSTANCE é obrigatória'),
  EVOLUTION_GROUP_JID: z
    .string()
    .min(1, 'EVOLUTION_GROUP_JID é obrigatório')
    .refine((v) => v.includes('@g.us') || /^\d+$/.test(v), {
      message: 'EVOLUTION_GROUP_JID deve ser um JID de grupo (@g.us) ou número',
    }),
  EVOLUTION_SEND_DELAY_MS: z.coerce.number().int().min(0).default(2000),

  CRON_SCHEDULE: z.string().default('*/5 * * * *'),
  CRON_RUN_ON_START: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),

  /** Auth Fase 2 — true = JWT obrigatório em /api e mutações */
  AUTH_ENABLED: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  JWT_SECRET: z.string().min(16).default('change-me-shopee-jwt-secret'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@shoppe.local'),
  SEED_ADMIN_PASSWORD: z.string().min(6).default('admin123'),
  SEED_ADMIN_NAME: z.string().default('Administrador'),

  /** Fase 3 — sync conversionReport a cada N ciclos do cron */
  CONVERSION_SYNC_ENABLED: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  CONVERSION_SYNC_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  /** Sync a cada N execuções do cron (ex.: 5 min * 6 = ~30 min) */
  CONVERSION_SYNC_EVERY_N_RUNS: z.coerce.number().int().min(1).max(288).default(6),

  /** Fase 3 — OpenRouter (opcional) */
  AI_MESSAGE_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
});

export type AppConfig = z.infer<typeof envSchema>;

function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
  }

  return parsed.data;
}

/** Singleton imutável de configuração — carregado uma vez na subida do processo */
export const env: AppConfig = loadConfig();
