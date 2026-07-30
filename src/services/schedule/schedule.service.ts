/**
 * Processa posts agendados (calendário — Fase 2).
 */

import { prisma } from '../../database/prisma.js';
import { EvolutionMessageService } from '../evolution/index.js';
import { PublishQuotaService } from '../filters/publish-quota.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class ScheduleService {
  constructor(
    private readonly evolution: EvolutionMessageService = new EvolutionMessageService(),
    private readonly quota: PublishQuotaService = new PublishQuotaService(),
  ) {}

  async processDue(now = new Date()): Promise<number> {
    const quota = await this.quota.evaluate(now);
    if (!quota.allowed) {
      logger.info({ reason: quota.reason }, 'Agenda: cota bloqueou envios');
      return 0;
    }

    const due = await prisma.scheduledPost.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: env.FILTER_MAX_OFFERS_PER_RUN,
      include: {
        group: true,
        product: true,
      },
    });

    let sent = 0;

    for (const post of due) {
      const caption =
        post.messageText ??
        [
          `🗓️ *${post.title}*`,
          post.product?.name ? `📦 *${post.product.name}*` : null,
          post.offerLink ?? post.product?.offerLink ?? null,
        ]
          .filter(Boolean)
          .join('\n\n');

      const imageUrl = post.imageUrl ?? post.product?.imageUrl ?? null;
      const groupJid = post.group?.groupJid ?? env.EVOLUTION_GROUP_JID;

      try {
        await this.evolution.sendOfferToGroup(caption, imageUrl, groupJid);
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'sent', sentAt: new Date(), errorMessage: null },
        });
        sent += 1;
        logger.info({ postId: post.id, title: post.title }, 'Post agendado enviado');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro';
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'failed', errorMessage: message },
        });
        logger.error({ postId: post.id, err: error }, 'Falha no post agendado');
      }
    }

    return sent;
  }
}
