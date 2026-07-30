/**
 * Biblioteca de templates de posts.
 */

import { prisma } from '../../database/prisma.js';
import type { NormalizedOffer } from '../../models/offer.model.js';
import { formatBRL, formatDiscountPercent, truncate } from '../../utils/format.js';

export const DEFAULT_WHATSAPP_TEMPLATE = `🔥 *Oferta Imperdível*

📦 *{{name}}*

💰 Por: *{{price}}*
🏷️ Desconto: *{{discount}}*
{{rating}}
{{sales}}
{{shop}}

👉 {{link}}`;

export class TemplateService {
  async list(channel?: string) {
    return prisma.postTemplate.findMany({
      where: {
        isActive: true,
        ...(channel ? { channel } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async create(input: {
    name: string;
    channel?: string;
    body: string;
    isDefault?: boolean;
    createdById?: string;
  }) {
    if (input.isDefault) {
      await prisma.postTemplate.updateMany({
        where: { channel: input.channel ?? 'whatsapp', isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.postTemplate.create({
      data: {
        name: input.name,
        channel: input.channel ?? 'whatsapp',
        body: input.body,
        isDefault: input.isDefault ?? false,
        createdById: input.createdById,
      },
    });
  }

  async getDefaultBody(channel = 'whatsapp'): Promise<string> {
    const tpl = await prisma.postTemplate.findFirst({
      where: { channel, isActive: true, isDefault: true },
    });
    return tpl?.body ?? DEFAULT_WHATSAPP_TEMPLATE;
  }

  render(body: string, offer: NormalizedOffer): string {
    const vars: Record<string, string> = {
      name: truncate(offer.productName, 90),
      price: formatBRL(offer.priceMin),
      discount: formatDiscountPercent(offer.priceDiscountRate),
      rating: offer.ratingStar != null ? `⭐ ${offer.ratingStar.toFixed(1)}` : '',
      sales:
        offer.sales != null && offer.sales > 0
          ? `🔥 ${offer.sales.toLocaleString('pt-BR')} vendidos`
          : '',
      shop: offer.shopName ? `🏪 ${truncate(offer.shopName, 40)}` : '',
      link: offer.offerLink,
    };

    let out = body;
    for (const [key, value] of Object.entries(vars)) {
      out = out.replaceAll(`{{${key}}}`, value);
    }

    return out
      .split('\n')
      .filter((line, idx, arr) => !(line.trim() === '' && arr[idx - 1]?.trim() === ''))
      .join('\n')
      .trim();
  }
}
