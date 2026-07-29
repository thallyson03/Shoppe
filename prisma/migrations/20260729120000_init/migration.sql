-- Migration inicial espelhando prisma/schema.prisma
-- Gerada para deploy com `prisma migrate deploy`

CREATE TABLE IF NOT EXISTS "offers" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "shop_id" TEXT,
    "product_name" TEXT NOT NULL,
    "product_link" TEXT,
    "offer_link" TEXT NOT NULL,
    "image_url" TEXT,
    "price_min" DECIMAL(12,2),
    "price_max" DECIMAL(12,2),
    "price_discount_rate" INTEGER,
    "sales" INTEGER,
    "rating_star" DECIMAL(3,2),
    "commission_rate" DECIMAL(8,4),
    "seller_commission_rate" DECIMAL(8,4),
    "shopee_commission_rate" DECIMAL(8,4),
    "shop_name" TEXT,
    "message_text" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "content_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "offers_item_id_key" ON "offers"("item_id");
CREATE INDEX IF NOT EXISTS "offers_published_created_at_idx" ON "offers"("published", "created_at");
CREATE INDEX IF NOT EXISTS "offers_created_at_idx" ON "offers"("created_at");

CREATE TABLE IF NOT EXISTS "publish_logs" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "group_jid" TEXT NOT NULL,
    "evolution_msg_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "publish_logs_offer_id_idx" ON "publish_logs"("offer_id");
CREATE INDEX IF NOT EXISTS "publish_logs_created_at_idx" ON "publish_logs"("created_at");

CREATE TABLE IF NOT EXISTS "job_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "filtered_count" INTEGER NOT NULL DEFAULT 0,
    "new_offers_count" INTEGER NOT NULL DEFAULT 0,
    "published_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_runs_started_at_idx" ON "job_runs"("started_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'publish_logs_offer_id_fkey'
  ) THEN
    ALTER TABLE "publish_logs"
      ADD CONSTRAINT "publish_logs_offer_id_fkey"
      FOREIGN KEY ("offer_id") REFERENCES "offers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
