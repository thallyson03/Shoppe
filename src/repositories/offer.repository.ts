/**
 * Repository Pattern — acesso a dados de ofertas.
 * Isola o Prisma da camada de serviço (Dependency Inversion).
 */

import type { Offer, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import type { NormalizedOffer } from '../models/offer.model.js';

export interface CreateOfferInput extends NormalizedOffer {
  messageText?: string | null;
  contentHash?: string | null;
}

export class OfferRepository {
  /**
   * Retorna os itemIds que já existem no banco (deduplicação em lote).
   */
  async findExistingItemIds(itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) {
      return new Set();
    }

    const rows = await prisma.offer.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true },
    });

    return new Set(rows.map((r) => r.itemId));
  }

  async findByItemId(itemId: string): Promise<Offer | null> {
    return prisma.offer.findUnique({ where: { itemId } });
  }

  async create(data: CreateOfferInput): Promise<Offer> {
    return prisma.offer.create({
      data: {
        itemId: data.itemId,
        shopId: data.shopId,
        productName: data.productName,
        productLink: data.productLink,
        offerLink: data.offerLink,
        imageUrl: data.imageUrl,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        priceDiscountRate: data.priceDiscountRate,
        sales: data.sales,
        ratingStar: data.ratingStar,
        commissionRate: data.commissionRate,
        sellerCommissionRate: data.sellerCommissionRate,
        shopeeCommissionRate: data.shopeeCommissionRate,
        shopName: data.shopName,
        messageText: data.messageText ?? null,
        contentHash: data.contentHash ?? null,
      },
    });
  }

  async createManyIgnoringDuplicates(data: CreateOfferInput[]): Promise<number> {
    if (data.length === 0) {
      return 0;
    }

    const result = await prisma.offer.createMany({
      data: data.map((item) => ({
        itemId: item.itemId,
        shopId: item.shopId,
        productName: item.productName,
        productLink: item.productLink,
        offerLink: item.offerLink,
        imageUrl: item.imageUrl,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
        priceDiscountRate: item.priceDiscountRate,
        sales: item.sales,
        ratingStar: item.ratingStar,
        commissionRate: item.commissionRate,
        sellerCommissionRate: item.sellerCommissionRate,
        shopeeCommissionRate: item.shopeeCommissionRate,
        shopName: item.shopName,
        messageText: item.messageText ?? null,
        contentHash: item.contentHash ?? null,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  async markAsPublished(id: string, messageText: string): Promise<Offer> {
    return prisma.offer.update({
      where: { id },
      data: {
        published: true,
        publishedAt: new Date(),
        messageText,
      },
    });
  }

  async findUnpublished(limit: number): Promise<Offer[]> {
    return prisma.offer.findMany({
      where: { published: false },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async count(where?: Prisma.OfferWhereInput): Promise<number> {
    return prisma.offer.count({ where });
  }
}
