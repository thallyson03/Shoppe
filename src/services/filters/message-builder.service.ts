/**
 * Monta mensagens WhatsApp legíveis e atrativas a partir de uma oferta.
 */

import type { NormalizedOffer } from '../../models/offer.model.js';
import {
  formatBRL,
  formatDiscountPercent,
  truncate,
} from '../../utils/format.js';

export class MessageBuilderService {
  /**
   * Template padrão de oferta para grupos de promoção.
   */
  build(offer: NormalizedOffer): string {
    const name = truncate(offer.productName, 90);
    const price = formatBRL(offer.priceMin);
    const discount = formatDiscountPercent(offer.priceDiscountRate);
    const rating =
      offer.ratingStar != null ? `⭐ ${offer.ratingStar.toFixed(1)}` : null;
    const sales =
      offer.sales != null && offer.sales > 0
        ? `🔥 ${offer.sales.toLocaleString('pt-BR')} vendidos`
        : null;
    const shop = offer.shopName ? `🏪 ${truncate(offer.shopName, 40)}` : null;
    const meta = [rating, sales, shop].filter(Boolean).join('\n');

    return [
      '🛍️ *OFERTA SHOPEE*',
      '',
      `📦 *${name}*`,
      '',
      `💰 Preço: *${price}*`,
      `🏷️ Desconto: *${discount}*`,
      meta,
      '',
      `🔗 ${offer.offerLink}`,
    ]
      .filter((line) => line !== null && line !== '')
      .join('\n');
  }
}
