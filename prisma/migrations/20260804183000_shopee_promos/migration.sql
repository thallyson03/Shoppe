-- CreateTable
CREATE TABLE "shopee_promos" (
    "id" TEXT NOT NULL,
    "offer_key" TEXT NOT NULL,
    "offer_name" TEXT NOT NULL,
    "offer_link" TEXT NOT NULL,
    "original_link" TEXT,
    "image_url" TEXT,
    "commission_rate" DECIMAL(8,4),
    "offer_type" INTEGER,
    "category_id" TEXT,
    "collection_id" TEXT,
    "period_start_time" TIMESTAMP(3),
    "period_end_time" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "message_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopee_promos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopee_promos_offer_key_key" ON "shopee_promos"("offer_key");

-- CreateIndex
CREATE INDEX "shopee_promos_published_created_at_idx" ON "shopee_promos"("published", "created_at");

-- CreateIndex
CREATE INDEX "shopee_promos_period_end_time_idx" ON "shopee_promos"("period_end_time");
