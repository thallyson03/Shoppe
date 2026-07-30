-- Fase 3: conversões afiliado (conversionReport)

CREATE TABLE IF NOT EXISTS "conversions" (
    "id" TEXT NOT NULL,
    "conversion_id" TEXT NOT NULL,
    "purchase_time" TIMESTAMP(3) NOT NULL,
    "click_time" TIMESTAMP(3),
    "total_commission" DECIMAL(14,4) NOT NULL,
    "seller_commission" DECIMAL(14,4),
    "shopee_commission" DECIMAL(14,4),
    "buyer_type" TEXT,
    "device" TEXT,
    "utm_content" TEXT,
    "order_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversions_conversion_id_key" ON "conversions"("conversion_id");
CREATE INDEX IF NOT EXISTS "conversions_purchase_time_idx" ON "conversions"("purchase_time");
CREATE INDEX IF NOT EXISTS "conversions_order_status_idx" ON "conversions"("order_status");

CREATE TABLE IF NOT EXISTS "conversion_items" (
    "id" TEXT NOT NULL,
    "conversion_db_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "shop_name" TEXT,
    "item_price" DECIMAL(12,2),
    "qty" INTEGER NOT NULL DEFAULT 1,
    "item_total_commission" DECIMAL(14,4),
    "order_status" TEXT,
    "complete_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversion_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "conversion_items_conversion_db_id_idx" ON "conversion_items"("conversion_db_id");
CREATE INDEX IF NOT EXISTS "conversion_items_item_id_idx" ON "conversion_items"("item_id");
CREATE INDEX IF NOT EXISTS "conversion_items_order_id_idx" ON "conversion_items"("order_id");

DO $$ BEGIN
  ALTER TABLE "conversion_items" ADD CONSTRAINT "conversion_items_conversion_db_id_fkey"
    FOREIGN KEY ("conversion_db_id") REFERENCES "conversions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
