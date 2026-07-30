/**
 * Cliente OpenRouter — variação de captions (Fase 3).
 * Se desligado ou sem chave, retorna null (caller usa template).
 */

import axios from 'axios';
import { env } from '../../config/env.js';
import type { NormalizedOffer } from '../../models/offer.model.js';
import { logger } from '../../utils/logger.js';

export class OpenRouterService {
  isEnabled(): boolean {
    return env.AI_MESSAGE_ENABLED && Boolean(env.OPENROUTER_API_KEY);
  }

  async rewriteCaption(base: string, offer: NormalizedOffer): Promise<string | null> {
    if (!this.isEnabled()) return null;

    try {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: env.OPENROUTER_MODEL,
          temperature: 0.7,
          max_tokens: 400,
          messages: [
            {
              role: 'system',
              content:
                'Você escreve captions curtas de ofertas Shopee para WhatsApp em português do Brasil. ' +
                'Mantenha o link afiliado intacto. Use no máximo 8 linhas. Pode usar *negrito* estilo WhatsApp. ' +
                'Não invente preços. Não mencione comissão de afiliado nem que a mensagem é automática.',
            },
            {
              role: 'user',
              content:
                `Produto: ${offer.productName}\n` +
                `Preço mín: ${offer.priceMin}\n` +
                `Desconto %: ${offer.priceDiscountRate}\n` +
                `Link (obrigatório na mensagem): ${offer.offerLink}\n\n` +
                `Base para reescrever (mantenha o link):\n${base}`,
            },
          ],
        },
        {
          timeout: 20_000,
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/thallyson03/Shoppe',
            'X-Title': 'Shoppe Offers',
          },
        },
      );

      const text = res.data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) return null;
      if (!text.includes(offer.offerLink)) {
        return `${text.trim()}\n\n👉 ${offer.offerLink}`;
      }
      return text.trim();
    } catch (error) {
      logger.warn({ err: error }, 'OpenRouter falhou — usando template');
      return null;
    }
  }
}
