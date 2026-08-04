/**
 * Seed Fase 1 + Fase 2 (admin, template default, canal/grupo).
 */

import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';
import { hashPassword } from '../services/auth/auth.service.js';
import { DEFAULT_WHATSAPP_TEMPLATE } from '../services/templates/template.service.js';
import { logger } from '../utils/logger.js';

export async function seedPhase1Defaults(): Promise<void> {
  const channel = await prisma.channel.upsert({
    where: { name_type: { name: 'WhatsApp', type: 'whatsapp' } },
    create: { name: 'WhatsApp', type: 'whatsapp', isActive: true },
    update: { isActive: true },
  });

  // Só cria o grupo padrão em instalação nova.
  // Nunca recria/reativa após exclusão no dashboard (evita disparar no grupo removido).
  const existingGroup = await prisma.whatsAppGroup.findUnique({
    where: { groupJid: env.EVOLUTION_GROUP_JID },
  });
  if (!existingGroup) {
    const [groupCount, publishLogCount] = await Promise.all([
      prisma.whatsAppGroup.count(),
      prisma.publishLog.count(),
    ]);
    if (groupCount === 0 && publishLogCount === 0) {
      await prisma.whatsAppGroup.create({
        data: {
          name: 'Shopee',
          groupJid: env.EVOLUTION_GROUP_JID,
          categories: ['geral'],
          isActive: true,
          channelId: channel.id,
        },
      });
      logger.info({ groupJid: env.EVOLUTION_GROUP_JID }, 'Seed grupo WhatsApp criado');
    } else {
      logger.info(
        { groupCount, publishLogCount },
        'Seed: grupo do .env não recriado (já houve configuração/histórico)',
      );
    }
  }

  // Admin seed
  const adminEmail = env.SEED_ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: env.SEED_ADMIN_NAME,
        email: adminEmail,
        passwordHash: hashPassword(env.SEED_ADMIN_PASSWORD),
        role: 'admin',
        isActive: true,
      },
    });
    logger.info({ email: adminEmail }, 'Seed admin criado');
  }

  // Template WhatsApp default
  const defaultTpl = await prisma.postTemplate.findFirst({
    where: { channel: 'whatsapp', isDefault: true },
  });
  if (!defaultTpl) {
    await prisma.postTemplate.create({
      data: {
        name: 'Oferta padrão WhatsApp',
        channel: 'whatsapp',
        body: DEFAULT_WHATSAPP_TEMPLATE,
        isDefault: true,
        isActive: true,
      },
    });
    logger.info('Seed template WhatsApp default criado');
  }

  // Templates extras por canal (biblioteca)
  const channels = [
    {
      channel: 'instagram',
      name: 'Post Instagram',
      body: `🔥 Oferta imperdível!\n\n{{name}}\nDe/por: {{price}} ({{discount}} off)\n\n{{link}}\n\n#shopee #oferta #promo`,
    },
    {
      channel: 'telegram',
      name: 'Post Telegram',
      body: `🔥 *{{name}}*\n💰 {{price}} | 🏷️ {{discount}}\n👉 {{link}}`,
    },
  ] as const;

  for (const item of channels) {
    const exists = await prisma.postTemplate.findFirst({
      where: { channel: item.channel, name: item.name },
    });
    if (!exists) {
      await prisma.postTemplate.create({
        data: {
          name: item.name,
          channel: item.channel,
          body: item.body,
          isDefault: true,
          isActive: true,
        },
      });
    }
  }

  logger.info(
    { channelId: channel.id, groupJid: env.EVOLUTION_GROUP_JID },
    'Seed Fase 1/2 OK',
  );
}
