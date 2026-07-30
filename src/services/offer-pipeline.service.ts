/**
 * Orquestrador do pipeline de ofertas (Application Service).
 *
 * Fluxo:
 * 1. Buscar ofertas na Shopee Open API (a cada 5 min via cron)
 * 2. Filtrar por qualidade
 * 3. Salvar novas no banco (sem spam imediato)
 * 4. Publicar respeitando cota: 1/min, 50/dia, manhã/tarde/noite
 */

import { createHash } from 'node:crypto';
import type { NormalizedOffer, PipelineResult } from '../models/offer.model.js';
import { JobRunRepository, PublishLogRepository } from '../repositories/job-run.repository.js';
import { OfferRepository } from '../repositories/offer.repository.js';
import { EvolutionMessageService } from './evolution/index.js';
import { MessageBuilderService, OfferFilterService } from './filters/index.js';
import { PublishQuotaService } from './filters/publish-quota.service.js';
import { ProductSyncService } from './catalog/product-sync.service.js';
import { ShopeeOfferService } from './shopee/index.js';
import { prisma } from '../database/prisma.js';
import { sleep } from '../utils/format.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class OfferPipelineService {
  constructor(
    private readonly shopeeService: ShopeeOfferService = new ShopeeOfferService(),
    private readonly filterService: OfferFilterService = new OfferFilterService(),
    private readonly messageBuilder: MessageBuilderService = new MessageBuilderService(),
    private readonly evolutionService: EvolutionMessageService = new EvolutionMessageService(),
    private readonly offerRepository: OfferRepository = new OfferRepository(),
    private readonly publishLogRepository: PublishLogRepository = new PublishLogRepository(),
    private readonly jobRunRepository: JobRunRepository = new JobRunRepository(),
    private readonly quotaService: PublishQuotaService = new PublishQuotaService(),
    private readonly productSync: ProductSyncService = new ProductSyncService(),
  ) {}

  /**
   * Executa um ciclo completo. Seguro para ser chamado pelo cron ou via HTTP.
   */
  async run(): Promise<PipelineResult> {
    const job = await this.jobRunRepository.start();
    logger.info({ jobId: job.id }, 'Pipeline de ofertas iniciado');

    const result: PipelineResult = {
      fetchedCount: 0,
      filteredCount: 0,
      newOffersCount: 0,
      publishedCount: 0,
    };

    try {
      // 1. Buscar
      const fetched = await this.shopeeService.getOffers();
      result.fetchedCount = fetched.length;

      // 1b. Sincroniza catálogo (Product/Shop/PriceHistory) — Fase 1
      if (fetched.length > 0) {
        const synced = await this.productSync.syncMany(fetched);
        logger.info({ synced }, 'Catálogo sincronizado');
      }

      // 2. Filtrar
      const filtered = this.filterService.filter(fetched);
      result.filteredCount = filtered.length;

      // 3. Deduplicar + salvar (ficam unpublished até a cota liberar)
      if (filtered.length > 0) {
        const existingIds = await this.offerRepository.findExistingItemIds(
          filtered.map((o) => o.itemId),
        );
        const fresh = filtered.filter((o) => !existingIds.has(o.itemId));
        result.newOffersCount = fresh.length;

        for (const offer of fresh) {
          await this.persistOffer(offer);
        }
      }

      // 4. Publicar fila respeitando cota (1 por ciclo / 1 por minuto / 50 por dia)
      result.publishedCount = await this.publishFromQueue();

      await this.jobRunRepository.finish(job.id, {
        status: 'success',
        ...result,
      });

      logger.info({ jobId: job.id, ...result }, 'Pipeline de ofertas finalizado');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.jobRunRepository.finish(job.id, {
        status: 'error',
        ...result,
        errorMessage: message,
      });
      logger.error({ jobId: job.id, err: error, ...result }, 'Pipeline falhou');
      throw error;
    }
  }

  /** Salva oferta sem enviar (fila de publicação) */
  private async persistOffer(offer: NormalizedOffer): Promise<void> {
    const messageText = this.messageBuilder.build(offer);
    const contentHash = this.hashOffer(offer);
    const productId = await this.productSync.upsertFromOffer(offer);

    await this.offerRepository.create({
      ...offer,
      productId,
      messageText,
      contentHash,
    });
  }

  /**
   * Consome a fila unpublished sob as regras de frequência.
   */
  private async publishFromQueue(): Promise<number> {
    let sent = 0;
    const maxThisRun = env.FILTER_MAX_OFFERS_PER_RUN;
    let waitedForInterval = false;

    while (sent < maxThisRun) {
      let quota = await this.quotaService.evaluate();

      if (!quota.allowed && quota.msUntilNextSlot > 0 && !waitedForInterval && sent === 0) {
        const wait = Math.min(quota.msUntilNextSlot, 55_000);
        logger.info({ waitMs: wait, reason: quota.reason }, 'Aguardando intervalo mínimo');
        await sleep(wait);
        waitedForInterval = true;
        quota = await this.quotaService.evaluate();
      }

      if (!quota.allowed) {
        logger.info(
          {
            reason: quota.reason,
            period: quota.period,
            publishedToday: quota.publishedToday,
            periodLimit: quota.periodLimit,
            dailyLimit: quota.dailyLimit,
          },
          'Publicação adiada pela cota',
        );
        break;
      }

      const pending = await this.offerRepository.findUnpublished(1);
      if (pending.length === 0) {
        logger.info('Fila de ofertas vazia — nada para publicar');
        break;
      }

      const row = pending[0]!;
      const messageText =
        row.messageText ??
        this.messageBuilder.build({
          itemId: row.itemId,
          shopId: row.shopId,
          productName: row.productName,
          productLink: row.productLink,
          offerLink: row.offerLink,
          imageUrl: row.imageUrl,
          priceMin: row.priceMin != null ? Number(row.priceMin) : null,
          priceMax: row.priceMax != null ? Number(row.priceMax) : null,
          priceDiscountRate: row.priceDiscountRate,
          sales: row.sales,
          ratingStar: row.ratingStar != null ? Number(row.ratingStar) : null,
          commissionRate: row.commissionRate != null ? Number(row.commissionRate) : null,
          sellerCommissionRate:
            row.sellerCommissionRate != null ? Number(row.sellerCommissionRate) : null,
          shopeeCommissionRate:
            row.shopeeCommissionRate != null ? Number(row.shopeeCommissionRate) : null,
          shopName: row.shopName,
        });

      try {
        const groups = await this.resolveTargetGroups();
        let successCount = 0;

        for (const group of groups) {
          try {
            const sendResult = await this.evolutionService.sendOfferToGroup(
              messageText,
              row.imageUrl,
              group.groupJid,
            );
            await this.publishLogRepository.create({
              offerId: row.id,
              groupId: group.id,
              groupJid: group.groupJid,
              evolutionMsgId: sendResult.messageId,
              status: 'sent',
            });
            successCount += 1;
            if (env.EVOLUTION_SEND_DELAY_MS > 0 && groups.length > 1) {
              await sleep(env.EVOLUTION_SEND_DELAY_MS);
            }
          } catch (groupError) {
            const message =
              groupError instanceof Error ? groupError.message : 'Erro no envio';
            await this.publishLogRepository.create({
              offerId: row.id,
              groupId: group.id,
              groupJid: group.groupJid,
              status: 'error',
              errorMessage: message,
            });
            logger.error(
              { itemId: row.itemId, groupJid: group.groupJid, err: groupError },
              'Falha ao publicar em grupo',
            );
          }
        }

        if (successCount === 0) {
          throw new Error('Falha ao enviar para todos os grupos ativos');
        }

        await this.offerRepository.markAsPublished(row.id, messageText);
        sent += 1;
        logger.info(
          {
            itemId: row.itemId,
            offerId: row.id,
            groups: successCount,
            period: quota.period,
            publishedToday: quota.publishedToday + 1,
          },
          'Oferta publicada no WhatsApp',
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro no envio';
        await this.publishLogRepository.create({
          offerId: row.id,
          groupJid: env.EVOLUTION_GROUP_JID,
          status: 'error',
          errorMessage: message,
        });
        logger.error({ itemId: row.itemId, err: error }, 'Falha ao publicar oferta');
        break;
      }
    }

    return sent;
  }

  /**
   * Grupos ativos no banco; se vazio, fallback para EVOLUTION_GROUP_JID do .env
   */
  private async resolveTargetGroups(): Promise<Array<{ id: string | null; groupJid: string }>> {
    const groups = await prisma.whatsAppGroup.findMany({
      where: { isActive: true },
      select: { id: true, groupJid: true },
      orderBy: { createdAt: 'asc' },
    });

    if (groups.length > 0) {
      return groups;
    }

    return [{ id: null, groupJid: env.EVOLUTION_GROUP_JID }];
  }

  private hashOffer(offer: NormalizedOffer): string {
    const raw = `${offer.itemId}|${offer.offerLink}|${offer.priceMin ?? ''}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }
}
