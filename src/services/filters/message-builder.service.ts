/**
 * Monta mensagens WhatsApp a partir de template (biblioteca) ou fallback.
 */

import type { NormalizedOffer } from '../../models/offer.model.js';
import {
  formatBRL,
  formatDiscountPercent,
  truncate,
} from '../../utils/format.js';
import { TemplateService } from '../templates/template.service.js';

export class MessageBuilderService {
  constructor(private readonly templates: TemplateService = new TemplateService()) {}

  /** Usa template default do canal (WhatsApp) quando existir */
  async buildAsync(offer: NormalizedOffer, channel = 'whatsapp'): Promise<string> {
    const body = await this.templates.getDefaultBody(channel);
    return this.templates.render(body, offer);
  }

  /** Fallback síncrono (agenda / casos sem await) */
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
