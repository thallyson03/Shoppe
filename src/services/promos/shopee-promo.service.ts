/**
 * Sync e publicação de promoções Shopee (shopeeOfferV2).
 */

import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import type { NormalizedPromo, PromoSyncResult } from '../../models/promo.model.js';
import { AppError } from '../../utils/errors.js';
import { formatCommissionPercent, sleep, truncate } from '../../utils/format.js';
import { logger } from '../../utils/logger.js';
import { EvolutionMessageService } from '../evolution/index.js';
import { PublishQuotaService } from '../filters/publish-quota.service.js';
import { ShopeeOfferService } from '../shopee/index.js';

function formatPeriod(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleString('pt-BR', { timeZone: env.PUBLISH_TIMEZONE });
}

export class ShopeePromoService {
  constructor(
    private readonly shopee: ShopeeOfferService = new ShopeeOfferService(),
    private readonly evolution: EvolutionMessageService = new EvolutionMessageService(),
    private readonly quota: PublishQuotaService = new PublishQuotaService(),
  ) {}

  buildCaption(promo: {
    offerName: string;
    offerLink: string;
    commissionRate?: number | null;
    periodStartTime?: Date | null;
    periodEndTime?: Date | null;
  }): string {
    const name = truncate(promo.offerName, 100);
    const commission = formatCommissionPercent(
      promo.commissionRate != null ? Number(promo.commissionRate) : null,
    );
    const start = formatPeriod(promo.periodStartTime ?? null);
    const end = formatPeriod(promo.periodEndTime ?? null);
    const period =
      start || end
        ? `🗓️ ${start ?? '—'} → ${end ?? '—'}`
        : null;

    return [
      '🔥 *CAMPANHA SHOPEE*',
      '',
      `📦 *${name}*`,
      commission !== '—' ? `💰 Comissão afiliado: *${commission}*` : null,
      period,
      '',
      `🔗 ${promo.offerLink}`,
      '',
      '_Campanha oficial · Confira no app_',
    ]
      .filter((line) => line != null && line !== '')
      .join('\n');
  }

  async sync(): Promise<PromoSyncResult> {
    const fetched = await this.shopee.getPromos();
    const now = new Date();
    let upserted = 0;
    let skippedExpired = 0;

    for (const promo of fetched) {
      if (promo.periodEndTime && promo.periodEndTime < now) {
        skippedExpired += 1;
        continue;
      }

      await prisma.shopeePromo.upsert({
        where: { offerKey: promo.offerKey },
        create: this.toCreateData(promo),
        update: {
          offerName: promo.offerName,
          offerLink: promo.offerLink,
          originalLink: promo.originalLink,
          imageUrl: promo.imageUrl,
          commissionRate: promo.commissionRate,
          offerType: promo.offerType,
          categoryId: promo.categoryId,
          collectionId: promo.collectionId,
          periodStartTime: promo.periodStartTime,
          periodEndTime: promo.periodEndTime,
        },
      });
      upserted += 1;
    }

    logger.info({ fetched: fetched.length, upserted, skippedExpired }, 'Sync shopeeOfferV2 OK');
    return { fetched: fetched.length, upserted, skippedExpired };
  }

  async list(params: { q?: string; published?: boolean; limit?: number } = {}) {
    const limit = Math.min(params.limit ?? 50, 100);
    return prisma.shopeePromo.findMany({
      where: {
        ...(params.published != null ? { published: params.published } : {}),
        ...(params.q
          ? { offerName: { contains: params.q, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: [{ published: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async publishOne(id: string, options: { respectQuota?: boolean } = {}): Promise<{
    id: string;
    groups: number;
  }> {
    const promo = await prisma.shopeePromo.findUnique({ where: { id } });
    if (!promo) {
      throw new AppError('Promoção não encontrada', 'PROMO_NOT_FOUND', 404);
    }
    if (promo.published) {
      throw new AppError('Promoção já publicada', 'PROMO_ALREADY_PUBLISHED', 409);
    }
    if (promo.periodEndTime && promo.periodEndTime < new Date()) {
      throw new AppError('Promoção expirada', 'PROMO_EXPIRED', 400);
    }

    if (options.respectQuota !== false) {
      const decision = await this.quota.evaluate();
      if (!decision.allowed) {
        throw new AppError(
          `Cota bloqueou envio: ${decision.reason}`,
          'PROMO_QUOTA_BLOCKED',
          429,
        );
      }
    }

    const groups = await this.resolveTargetGroups();
    if (groups.length === 0) {
      throw new AppError(
        'Nenhum grupo WhatsApp ativo — cadastre em /groups',
        'NO_ACTIVE_GROUPS',
        400,
      );
    }

    const messageText = promo.messageText ?? this.buildCaption({
      offerName: promo.offerName,
      offerLink: promo.offerLink,
      commissionRate: promo.commissionRate != null ? Number(promo.commissionRate) : null,
      periodStartTime: promo.periodStartTime,
      periodEndTime: promo.periodEndTime,
    });

    let successCount = 0;
    for (const group of groups) {
      await this.evolution.sendOfferToGroup(messageText, promo.imageUrl, group.groupJid);
      successCount += 1;
      if (env.EVOLUTION_SEND_DELAY_MS > 0 && groups.length > 1) {
        await sleep(env.EVOLUTION_SEND_DELAY_MS);
      }
    }

    await prisma.shopeePromo.update({
      where: { id },
      data: {
        published: true,
        publishedAt: new Date(),
        messageText,
      },
    });

    logger.info({ promoId: id, groups: successCount }, 'Promoção publicada no WhatsApp');
    return { id, groups: successCount };
  }

  async publishPending(limit = env.SHOPEE_PROMO_MAX_PUBLISH_PER_RUN): Promise<number> {
    let sent = 0;
    const now = new Date();

    while (sent < limit) {
      const quota = await this.quota.evaluate();
      if (!quota.allowed) {
        logger.info({ reason: quota.reason }, 'Promo auto-publish adiada pela cota');
        break;
      }

      const pending = await prisma.shopeePromo.findFirst({
        where: {
          published: false,
          OR: [{ periodEndTime: null }, { periodEndTime: { gte: now } }],
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!pending) {
        logger.info('Fila de promoções vazia');
        break;
      }

      try {
        await this.publishOne(pending.id, { respectQuota: false });
        sent += 1;
      } catch (error) {
        logger.error({ promoId: pending.id, err: error }, 'Falha ao publicar promoção');
        break;
      }
    }

    return sent;
  }

  private toCreateData(promo: NormalizedPromo) {
    return {
      offerKey: promo.offerKey,
      offerName: promo.offerName,
      offerLink: promo.offerLink,
      originalLink: promo.originalLink,
      imageUrl: promo.imageUrl,
      commissionRate: promo.commissionRate,
      offerType: promo.offerType,
      categoryId: promo.categoryId,
      collectionId: promo.collectionId,
      periodStartTime: promo.periodStartTime,
      periodEndTime: promo.periodEndTime,
      messageText: this.buildCaption(promo),
    };
  }

  private async resolveTargetGroups(): Promise<Array<{ id: string; groupJid: string }>> {
    return prisma.whatsAppGroup.findMany({
      where: { isActive: true },
      select: { id: true, groupJid: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
