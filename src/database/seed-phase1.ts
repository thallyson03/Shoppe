/**
 * Seed inicial Fase 1 — canal WhatsApp + grupo padrão do .env
 */

import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function seedPhase1Defaults(): Promise<void> {
  const channel = await prisma.channel.upsert({
    where: { name_type: { name: 'WhatsApp', type: 'whatsapp' } },
    create: { name: 'WhatsApp', type: 'whatsapp', isActive: true },
    update: { isActive: true },
  });

  await prisma.whatsAppGroup.upsert({
    where: { groupJid: env.EVOLUTION_GROUP_JID },
    create: {
      name: 'Shopee',
      groupJid: env.EVOLUTION_GROUP_JID,
      categories: ['geral'],
      isActive: true,
      channelId: channel.id,
    },
    update: {
      channelId: channel.id,
      isActive: true,
    },
  });

  logger.info(
    { channelId: channel.id, groupJid: env.EVOLUTION_GROUP_JID },
    'Seed Fase 1: canal e grupo WhatsApp OK',
  );
}
