/**
 * Sincroniza ofertas da Shopee para o catálogo Product/Shop (Fase 1).
 */

import { prisma } from '../../database/prisma.js';
import type { NormalizedOffer } from '../../models/offer.model.js';
import { logger } from '../../utils/logger.js';

export class ProductSyncService {
  /**
   * Upsert de produto + loja + ponto de histórico de preço (quando preço muda).
   */
  async upsertFromOffer(offer: NormalizedOffer): Promise<string> {
    let shopDbId: string | null = null;

    if (offer.shopId) {
      const shop = await prisma.shop.upsert({
        where: { shopId: offer.shopId },
        create: {
          shopId: offer.shopId,
          name: offer.shopName ?? `Loja ${offer.shopId}`,
        },
        update: {
          name: offer.shopName ?? undefined,
        },
      });
      shopDbId = shop.id;
    }

    const existing = await prisma.product.findUnique({
      where: { itemId: offer.itemId },
      select: { id: true, priceMin: true },
    });

    const product = await prisma.product.upsert({
      where: { itemId: offer.itemId },
      create: {
        itemId: offer.itemId,
        shopId: shopDbId,
        externalShopId: offer.shopId,
        name: offer.productName,
        imageUrl: offer.imageUrl,
        productLink: offer.productLink,
        offerLink: offer.offerLink,
        priceMin: offer.priceMin,
        priceMax: offer.priceMax,
        priceDiscountRate: offer.priceDiscountRate,
        sales: offer.sales ?? 0,
        ratingStar: offer.ratingStar,
        commissionRate: offer.commissionRate,
        sellerCommissionRate: offer.sellerCommissionRate,
        shopeeCommissionRate: offer.shopeeCommissionRate,
        lastSyncedAt: new Date(),
      },
      update: {
        shopId: shopDbId ?? undefined,
        externalShopId: offer.shopId ?? undefined,
        name: offer.productName,
        imageUrl: offer.imageUrl ?? undefined,
        productLink: offer.productLink ?? undefined,
        offerLink: offer.offerLink,
        priceMin: offer.priceMin,
        priceMax: offer.priceMax,
        priceDiscountRate: offer.priceDiscountRate,
        sales: offer.sales ?? undefined,
        ratingStar: offer.ratingStar,
        commissionRate: offer.commissionRate,
        sellerCommissionRate: offer.sellerCommissionRate,
        shopeeCommissionRate: offer.shopeeCommissionRate,
        lastSyncedAt: new Date(),
      },
    });

    const prevPrice = existing?.priceMin != null ? Number(existing.priceMin) : null;
    const nextPrice = offer.priceMin;

    if (nextPrice != null && (prevPrice === null || Math.abs(prevPrice - nextPrice) > 0.009)) {
      await prisma.priceHistory.create({
        data: {
          productId: product.id,
          priceMin: nextPrice,
          priceMax: offer.priceMax,
        },
      });
    }

    return product.id;
  }

  async syncMany(offers: NormalizedOffer[]): Promise<number> {
    let count = 0;
    for (const offer of offers) {
      try {
        await this.upsertFromOffer(offer);
        count += 1;
      } catch (error) {
        logger.warn({ err: error, itemId: offer.itemId }, 'Falha ao sincronizar produto');
      }
    }
    return count;
  }
}
