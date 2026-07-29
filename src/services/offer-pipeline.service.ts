/**
 * Orquestrador do pipeline de ofertas (Application Service).
 *
 * Fluxo:
 * 1. Buscar ofertas na Shopee Open API
 * 2. Filtrar por qualidade
 * 3. Remover já existentes (deduplicação)
 * 4. Persistência
 * 5. Montar mensagem
 * 6. Publicar no grupo WhatsApp via Evolution
 * 7. Registrar logs / job run
 */

import { createHash } from 'node:crypto';
import type { NormalizedOffer, PipelineResult } from '../models/offer.model.js';
import { JobRunRepository, PublishLogRepository } from '../repositories/job-run.repository.js';
import { OfferRepository } from '../repositories/offer.repository.js';
import { EvolutionMessageService } from './evolution/index.js';
import { MessageBuilderService, OfferFilterService } from './filters/index.js';
import { ShopeeOfferService } from './shopee/index.js';
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
      // 0. Reprocessa ofertas salvas que falharam no envio anterior
      result.publishedCount += await this.retryUnpublished();

      // 1. Buscar
      const fetched = await this.shopeeService.getOffers();
      result.fetchedCount = fetched.length;

      // 2. Filtrar
      const filtered = this.filterService.filter(fetched);
      result.filteredCount = filtered.length;

      if (filtered.length === 0) {
        await this.jobRunRepository.finish(job.id, {
          status: 'success',
          ...result,
        });
        logger.info({ jobId: job.id, ...result }, 'Nenhuma oferta nova passou no filtro');
        return result;
      }

      // 3. Deduplicar contra o banco
      const existingIds = await this.offerRepository.findExistingItemIds(
        filtered.map((o) => o.itemId),
      );
      const fresh = filtered.filter((o) => !existingIds.has(o.itemId));
      result.newOffersCount = fresh.length;

      if (fresh.length === 0) {
        await this.jobRunRepository.finish(job.id, {
          status: 'success',
          ...result,
        });
        logger.info({ jobId: job.id, ...result }, 'Todas as ofertas já existem no banco');
        return result;
      }

      // 4–6. Persistir + enviar
      for (const offer of fresh) {
        const published = await this.persistAndPublish(offer);
        if (published) {
          result.publishedCount += 1;
          if (env.EVOLUTION_SEND_DELAY_MS > 0) {
            await sleep(env.EVOLUTION_SEND_DELAY_MS);
          }
        }
      }

      await this.jobRunRepository.finish(job.id, {
        status: result.publishedCount > 0 || fresh.length === 0 ? 'success' : 'partial',
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

  /** Reenvia ofertas que ficaram com published=false após falha na Evolution */
  private async retryUnpublished(): Promise<number> {
    const pending = await this.offerRepository.findUnpublished(env.FILTER_MAX_OFFERS_PER_RUN);
    let sent = 0;

    for (const row of pending) {
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
        const sendResult = await this.evolutionService.sendToGroup(messageText);
        await this.offerRepository.markAsPublished(row.id, messageText);
        await this.publishLogRepository.create({
          offerId: row.id,
          groupJid: env.EVOLUTION_GROUP_JID,
          evolutionMsgId: sendResult.messageId,
          status: 'sent',
        });
        sent += 1;
        if (env.EVOLUTION_SEND_DELAY_MS > 0) {
          await sleep(env.EVOLUTION_SEND_DELAY_MS);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro no reenvio';
        await this.publishLogRepository.create({
          offerId: row.id,
          groupJid: env.EVOLUTION_GROUP_JID,
          status: 'error',
          errorMessage: message,
        });
        logger.warn({ offerId: row.id, err: error }, 'Reenvio de oferta pendente falhou');
      }
    }

    return sent;
  }

  private async persistAndPublish(offer: NormalizedOffer): Promise<boolean> {
    const messageText = this.messageBuilder.build(offer);
    const contentHash = this.hashOffer(offer);

    const saved = await this.offerRepository.create({
      ...offer,
      messageText,
      contentHash,
    });

    try {
      const sendResult = await this.evolutionService.sendToGroup(messageText);

      await this.offerRepository.markAsPublished(saved.id, messageText);
      await this.publishLogRepository.create({
        offerId: saved.id,
        groupJid: env.EVOLUTION_GROUP_JID,
        evolutionMsgId: sendResult.messageId,
        status: 'sent',
      });

      logger.info(
        { itemId: offer.itemId, offerId: saved.id, messageId: sendResult.messageId },
        'Oferta publicada no WhatsApp',
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro no envio';
      await this.publishLogRepository.create({
        offerId: saved.id,
        groupJid: env.EVOLUTION_GROUP_JID,
        status: 'error',
        errorMessage: message,
      });
      logger.error({ itemId: offer.itemId, err: error }, 'Falha ao publicar oferta');
      return false;
    }
  }

  private hashOffer(offer: NormalizedOffer): string {
    const raw = `${offer.itemId}|${offer.offerLink}|${offer.priceMin ?? ''}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }
}
