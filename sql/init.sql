-- =============================================================================
-- SQL de referência / init opcional (Docker monta em docker-entrypoint-initdb.d)
-- O schema oficial é gerenciado pelo Prisma Migrate.
-- Este arquivo documenta a estrutura esperada e índices auxiliares.
-- =============================================================================

-- Extensão útil para UUIDs (Prisma usa cuid por padrão; mantida por compatibilidade)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Comentários de documentação (tabelas criadas via Prisma)
COMMENT ON DATABASE shopee_offers IS 'Monitor de ofertas Shopee Affiliate + WhatsApp';

-- Após `prisma migrate deploy`, as tabelas serão:
--   offers, publish_logs, job_runs
--
-- Consultas úteis de operação:

-- Ofertas publicadas nas últimas 24h:
-- SELECT item_id, product_name, price_min, published_at
-- FROM offers
-- WHERE published = true AND published_at >= NOW() - INTERVAL '24 hours'
-- ORDER BY published_at DESC;

-- Taxa de sucesso dos jobs:
-- SELECT status, COUNT(*) AS total
-- FROM job_runs
-- WHERE started_at >= NOW() - INTERVAL '7 days'
-- GROUP BY status;

-- Ofertas pendentes de envio:
-- SELECT id, item_id, product_name, created_at
-- FROM offers
-- WHERE published = false
-- ORDER BY created_at ASC
-- LIMIT 50;
