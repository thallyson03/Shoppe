/**
 * Filtros de qualidade das ofertas (Service Layer).
 * Aplica regras de negócio configuráveis via .env.
 */

import { env } from '../../config/env.js';
import type { NormalizedOffer, OfferFilterCriteria } from '../../models/offer.model.js';
import { logger } from '../../utils/logger.js';

export class OfferFilterService {
  constructor(
    private readonly criteria: OfferFilterCriteria = {
      minCommissionRate: env.FILTER_MIN_COMMISSION_RATE,
      minDiscountRate: env.FILTER_MIN_DISCOUNT_RATE,
      minRating: env.FILTER_MIN_RATING,
      minSales: env.FILTER_MIN_SALES,
      maxOffersPerRun: env.FILTER_MAX_OFFERS_PER_RUN,
    },
  ) {}

  /**
   * Filtra e ordena ofertas por atratividade (desconto + comissão + vendas).
   * Limita ao máximo configurado por ciclo.
   */
  filter(offers: NormalizedOffer[]): NormalizedOffer[] {
    const passed = offers.filter((offer) => this.passes(offer));

    const sorted = [...passed].sort((a, b) => this.score(b) - this.score(a));
    const limited = sorted.slice(0, this.criteria.maxOffersPerRun);

    logger.info(
      {
        input: offers.length,
        afterFilter: passed.length,
        selected: limited.length,
        criteria: this.criteria,
      },
      'Filtro de ofertas aplicado',
    );

    return limited;
  }

  private passes(offer: NormalizedOffer): boolean {
    if (!offer.offerLink || !offer.productName) {
      return false;
    }

    const commission = offer.commissionRate ?? 0;
    if (commission < this.criteria.minCommissionRate) {
      return false;
    }

    const discount = offer.priceDiscountRate ?? 0;
    if (discount < this.criteria.minDiscountRate) {
      return false;
    }

    const rating = offer.ratingStar ?? 0;
    if (rating < this.criteria.minRating) {
      return false;
    }

    const sales = offer.sales ?? 0;
    if (sales < this.criteria.minSales) {
      return false;
    }

    return true;
  }

  /** Score heurístico para priorizar as melhores ofertas */
  private score(offer: NormalizedOffer): number {
    const discount = offer.priceDiscountRate ?? 0;
    const commission = (offer.commissionRate ?? 0) * 100;
    const rating = offer.ratingStar ?? 0;
    const salesLog = Math.log10((offer.sales ?? 0) + 1);

    return discount * 2 + commission * 3 + rating * 5 + salesLog * 4;
  }
}
