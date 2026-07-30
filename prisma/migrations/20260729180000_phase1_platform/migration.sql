-- Fase 1: catálogo, canais, grupos, campanhas e vínculos

CREATE TABLE IF NOT EXISTS "shops" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "rating" DECIMAL(3,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shops_shop_id_key" ON "shops"("shop_id");

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "shop_db_id" TEXT,
    "external_shop_id" TEXT,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "product_link" TEXT,
    "offer_link" TEXT NOT NULL,
    "price_min" DECIMAL(12,2),
    "price_max" DECIMAL(12,2),
    "price_discount_rate" INTEGER,
    "sales" INTEGER DEFAULT 0,
    "rating_star" DECIMAL(3,2),
    "commission_rate" DECIMAL(8,4),
    "seller_commission_rate" DECIMAL(8,4),
    "shopee_commission_rate" DECIMAL(8,4),
    "category" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "products_item_id_key" ON "products"("item_id");
CREATE INDEX IF NOT EXISTS "products_commission_rate_idx" ON "products"("commission_rate");
CREATE INDEX IF NOT EXISTS "products_sales_idx" ON "products"("sales");
CREATE INDEX IF NOT EXISTS "products_rating_star_idx" ON "products"("rating_star");
CREATE INDEX IF NOT EXISTS "products_price_discount_rate_idx" ON "products"("price_discount_rate");
CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products"("created_at");

CREATE TABLE IF NOT EXISTS "price_history" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price_min" DECIMAL(12,2) NOT NULL,
    "price_max" DECIMAL(12,2),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "price_history_product_id_recorded_at_idx" ON "price_history"("product_id", "recorded_at");

CREATE TABLE IF NOT EXISTS "channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "channels_name_type_key" ON "channels"("name", "type");

CREATE TABLE IF NOT EXISTS "whatsapp_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_jid" TEXT NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "channel_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_groups_group_jid_key" ON "whatsapp_groups"("group_jid");
CREATE INDEX IF NOT EXISTS "whatsapp_groups_is_active_idx" ON "whatsapp_groups"("is_active");

CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel_id" TEXT,
    "group_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "commission_goal" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "campaigns_is_active_starts_at_ends_at_idx" ON "campaigns"("is_active", "starts_at", "ends_at");

-- Alterações em offers / publish_logs
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "product_id" TEXT;
CREATE INDEX IF NOT EXISTS "offers_product_id_idx" ON "offers"("product_id");

ALTER TABLE "publish_logs" ADD COLUMN IF NOT EXISTS "group_id" TEXT;
CREATE INDEX IF NOT EXISTS "publish_logs_group_id_idx" ON "publish_logs"("group_id");

DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_shop_db_id_fkey"
    FOREIGN KEY ("shop_db_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_channel_id_fkey"
    FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_channel_id_fkey"
    FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "whatsapp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "publish_logs" ADD CONSTRAINT "publish_logs_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "whatsapp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
