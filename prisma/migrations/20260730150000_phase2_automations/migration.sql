-- Fase 2: automações e calendário

CREATE TABLE IF NOT EXISTS "automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "logic" TEXT NOT NULL DEFAULT 'and',
    "conditions" JSONB NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'send_whatsapp',
    "group_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "automation_rules_is_active_priority_idx"
  ON "automation_rules"("is_active", "priority");

CREATE TABLE IF NOT EXISTS "scheduled_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "product_id" TEXT,
    "group_id" TEXT,
    "message_text" TEXT,
    "image_url" TEXT,
    "offer_link" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "scheduled_posts_status_scheduled_at_idx"
  ON "scheduled_posts"("status", "scheduled_at");

DO $$ BEGIN
  ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "whatsapp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "whatsapp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
