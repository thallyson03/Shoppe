/**
 * Monta mensagens WhatsApp a partir de template (+ IA opcional).
 */

import type { NormalizedOffer } from '../../models/offer.model.js';
import {
  formatBRL,
  formatDiscountPercent,
  truncate,
} from '../../utils/format.js';
import { OpenRouterService } from '../ai/openrouter.service.js';
import { TemplateService } from '../templates/template.service.js';

export class MessageBuilderService {
  constructor(
    private readonly templates: TemplateService = new TemplateService(),
    private readonly ai: OpenRouterService = new OpenRouterService(),
  ) {}

  /** Usa template default do canal; opcionalmente reescreve via OpenRouter */
  async buildAsync(offer: NormalizedOffer, channel = 'whatsapp'): Promise<string> {
    const body = await this.templates.getDefaultBody(channel);
    const rendered = this.templates.render(body, offer);
    const rewritten = await this.ai.rewriteCaption(rendered, offer);
    return rewritten ?? rendered;
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
