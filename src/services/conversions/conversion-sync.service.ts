/**
 * Sync de conversionReport → Postgres (Fase 3).
 */

import { prisma } from '../../database/prisma.js';
import { ShopeeGraphQLClient } from '../shopee/shopee-graphql.client.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

export class ConversionSyncService {
  constructor(private readonly client: ShopeeGraphQLClient = new ShopeeGraphQLClient()) {}

  /**
   * Busca janela recente na Shopee e faz upsert.
   * Falhas não devem derrubar o pipeline de ofertas.
   */
  async syncRecent(days = env.CONVERSION_SYNC_DAYS): Promise<{ upserted: number }> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - Math.max(1, days) * 24 * 60 * 60;

    logger.info({ start, end, days }, 'Sync conversionReport iniciado');

    const nodes = await this.client.fetchAllConversions({
      purchaseTimeStart: start,
      purchaseTimeEnd: end,
      orderStatus: 'ALL',
      limit: 50,
    });

    let upserted = 0;
    for (const c of nodes) {
      await prisma.$transaction(async (tx) => {
        const row = await tx.conversion.upsert({
          where: { conversionId: c.conversionId },
          create: {
            conversionId: c.conversionId,
            purchaseTime: c.purchaseTime,
            clickTime: c.clickTime,
            totalCommission: c.totalCommission,
            sellerCommission: c.sellerCommission,
            shopeeCommission: c.shopeeCommission,
            buyerType: c.buyerType,
            device: c.device,
            utmContent: c.utmContent,
            orderStatus: c.orderStatus,
          },
          update: {
            purchaseTime: c.purchaseTime,
            clickTime: c.clickTime,
            totalCommission: c.totalCommission,
            sellerCommission: c.sellerCommission,
            shopeeCommission: c.shopeeCommission,
            buyerType: c.buyerType,
            device: c.device,
            utmContent: c.utmContent,
            orderStatus: c.orderStatus,
          },
        });

        await tx.conversionItem.deleteMany({ where: { conversionDbId: row.id } });
        if (c.items.length > 0) {
          await tx.conversionItem.createMany({
            data: c.items.map((item) => ({
              conversionDbId: row.id,
              orderId: item.orderId,
              itemId: item.itemId,
              itemName: item.itemName,
              shopName: item.shopName,
              itemPrice: item.itemPrice,
              qty: item.qty,
              itemTotalCommission: item.itemTotalCommission,
              orderStatus: item.orderStatus,
              completeTime: item.completeTime,
            })),
          });
        }
      });
      upserted += 1;
    }

    logger.info({ upserted }, 'Sync conversionReport concluído');
    return { upserted };
  }
}
