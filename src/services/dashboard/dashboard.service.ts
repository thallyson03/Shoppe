/**
 * Métricas e listagens do Dashboard (Fase 1–3).
 */

import { prisma } from '../../database/prisma.js';
import { PublishQuotaService } from '../filters/publish-quota.service.js';

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

async function sumCommission(from: Date, to?: Date): Promise<number> {
  const agg = await prisma.conversion.aggregate({
    where: {
      purchaseTime: {
        gte: from,
        ...(to ? { lte: to } : {}),
      },
    },
    _sum: { totalCommission: true },
    _count: { _all: true },
  });
  return Number(agg._sum.totalCommission ?? 0);
}

async function countConversions(from: Date, to?: Date): Promise<number> {
  return prisma.conversion.count({
    where: {
      purchaseTime: {
        gte: from,
        ...(to ? { lte: to } : {}),
      },
    },
  });
}

export class DashboardService {
  constructor(private readonly quotaService: PublishQuotaService = new PublishQuotaService()) {}

  async getOverview() {
    const today = startOfDay();
    const month = startOfMonth();
    const now = new Date();

    const [
      productsTotal,
      productsSyncedToday,
      sentToday,
      sentMonth,
      pendingQueue,
      activeCampaigns,
      activeGroups,
      quota,
      recentSends,
      topProducts,
      recentJobs,
      commissionToday,
      commissionMonth,
      conversionsToday,
      conversionsMonth,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { lastSyncedAt: { gte: today } } }),
      prisma.offer.count({ where: { published: true, publishedAt: { gte: today } } }),
      prisma.offer.count({ where: { published: true, publishedAt: { gte: month } } }),
      prisma.offer.count({ where: { published: false } }),
      prisma.campaign.count({
        where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      }),
      prisma.whatsAppGroup.count({ where: { isActive: true } }),
      this.quotaService.evaluate(),
      prisma.publishLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          offer: {
            select: {
              productName: true,
              imageUrl: true,
              priceMin: true,
              commissionRate: true,
              offerLink: true,
            },
          },
          group: { select: { name: true } },
        },
      }),
      prisma.product.findMany({
        take: 10,
        orderBy: { sales: 'desc' },
        select: {
          id: true,
          itemId: true,
          name: true,
          imageUrl: true,
          priceMin: true,
          sales: true,
          commissionRate: true,
          ratingStar: true,
          offerLink: true,
        },
      }),
      prisma.jobRun.findMany({ take: 8, orderBy: { startedAt: 'desc' } }),
      sumCommission(today),
      sumCommission(month),
      countConversions(today),
      countConversions(month),
    ]);

    return {
      kpis: {
        commissionToday,
        commissionMonth,
        clicks: null as number | null,
        conversions: conversionsMonth,
        conversionsToday,
        productsSentToday: sentToday,
        productsSentMonth: sentMonth,
        productsTotal,
        productsSyncedToday,
        pendingQueue,
        activeCampaigns,
        activeGroups,
        note:
          'Comissão/conversões via conversionReport Shopee. Cliques não são expostos pela API afiliado.',
      },
      quota,
      recentSends: recentSends.map((s) => ({
        id: s.id,
        status: s.status,
        groupJid: s.groupJid,
        groupName: s.group?.name ?? null,
        createdAt: s.createdAt,
        productName: s.offer.productName,
        imageUrl: s.offer.imageUrl,
        priceMin: s.offer.priceMin != null ? Number(s.offer.priceMin) : null,
        commissionRate: s.offer.commissionRate != null ? Number(s.offer.commissionRate) : null,
        offerLink: s.offer.offerLink,
      })),
      topProducts: topProducts.map((p) => ({
        ...p,
        priceMin: p.priceMin != null ? Number(p.priceMin) : null,
        commissionRate: p.commissionRate != null ? Number(p.commissionRate) : null,
        ratingStar: p.ratingStar != null ? Number(p.ratingStar) : null,
      })),
      recentJobs,
    };
  }

  async getAnalytics(from?: Date, to?: Date) {
    const end = to ?? new Date();
    const start = from ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const conversions = await prisma.conversion.findMany({
      where: { purchaseTime: { gte: start, lte: end } },
      include: { items: true },
      orderBy: { purchaseTime: 'asc' },
    });

    const byDay = new Map<string, { commission: number; conversions: number }>();
    const byStatus = new Map<string, number>();
    const byProduct = new Map<
      string,
      { itemId: string; name: string; commission: number; qty: number }
    >();

    for (const c of conversions) {
      const day = c.purchaseTime.toISOString().slice(0, 10);
      const prev = byDay.get(day) ?? { commission: 0, conversions: 0 };
      prev.commission += Number(c.totalCommission);
      prev.conversions += 1;
      byDay.set(day, prev);

      const status = c.orderStatus ?? 'UNKNOWN';
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);

      for (const item of c.items) {
        const key = item.itemId ?? item.itemName ?? 'unknown';
        const row = byProduct.get(key) ?? {
          itemId: item.itemId ?? key,
          name: item.itemName ?? key,
          commission: 0,
          qty: 0,
        };
        row.commission += Number(item.itemTotalCommission ?? 0);
        row.qty += item.qty;
        byProduct.set(key, row);
      }
    }

    const topProducts = [...byProduct.values()]
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 15);

    return {
      from: start,
      to: end,
      totals: {
        commission: conversions.reduce((s, c) => s + Number(c.totalCommission), 0),
        conversions: conversions.length,
      },
      daily: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
      byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
      topProducts,
      recent: conversions
        .slice()
        .reverse()
        .slice(0, 30)
        .map((c) => ({
          id: c.id,
          conversionId: c.conversionId,
          purchaseTime: c.purchaseTime,
          totalCommission: Number(c.totalCommission),
          orderStatus: c.orderStatus,
          itemCount: c.items.length,
        })),
    };
  }

  async listProducts(params: {
    q?: string;
    minCommission?: number;
    minRating?: number;
    minSales?: number;
    minDiscount?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        params.q
          ? { name: { contains: params.q, mode: 'insensitive' as const } }
          : {},
        params.minCommission != null
          ? { commissionRate: { gte: params.minCommission } }
          : {},
        params.minRating != null ? { ratingStar: { gte: params.minRating } } : {},
        params.minSales != null ? { sales: { gte: params.minSales } } : {},
        params.minDiscount != null
          ? { priceDiscountRate: { gte: params.minDiscount } }
          : {},
      ],
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sales: 'desc' }, { updatedAt: 'desc' }],
        include: { shop: { select: { name: true, shopId: true } } },
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((p) => ({
        id: p.id,
        itemId: p.itemId,
        name: p.name,
        imageUrl: p.imageUrl,
        offerLink: p.offerLink,
        productLink: p.productLink,
        priceMin: p.priceMin != null ? Number(p.priceMin) : null,
        priceMax: p.priceMax != null ? Number(p.priceMax) : null,
        priceDiscountRate: p.priceDiscountRate,
        sales: p.sales,
        ratingStar: p.ratingStar != null ? Number(p.ratingStar) : null,
        commissionRate: p.commissionRate != null ? Number(p.commissionRate) : null,
        shopName: p.shop?.name ?? null,
        lastSyncedAt: p.lastSyncedAt,
      })),
    };
  }

  async listGroups() {
    return prisma.whatsAppGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { channel: true },
    });
  }

  async createGroup(input: {
    name: string;
    groupJid: string;
    categories?: string[];
    isActive?: boolean;
  }) {
    let channel = await prisma.channel.findFirst({
      where: { type: 'whatsapp', name: 'WhatsApp' },
    });
    if (!channel) {
      channel = await prisma.channel.create({
        data: { name: 'WhatsApp', type: 'whatsapp' },
      });
    }

    return prisma.whatsAppGroup.create({
      data: {
        name: input.name,
        groupJid: input.groupJid,
        categories: input.categories ?? [],
        isActive: input.isActive ?? true,
        channelId: channel.id,
      },
    });
  }

  async listCampaigns() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        channel: true,
        group: { select: { id: true, name: true, groupJid: true } },
      },
    });
  }

  async createCampaign(input: {
    name: string;
    startsAt: string;
    endsAt: string;
    commissionGoal?: number;
    groupId?: string;
    channelId?: string;
  }) {
    return prisma.campaign.create({
      data: {
        name: input.name,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        commissionGoal: input.commissionGoal,
        groupId: input.groupId,
        channelId: input.channelId,
        isActive: true,
      },
    });
  }

  async updateGroup(id: string, data: { isActive?: boolean; name?: string; categories?: string[] }) {
    return prisma.whatsAppGroup.update({
      where: { id },
      data: {
        isActive: data.isActive,
        name: data.name,
        categories: data.categories,
      },
    });
  }

  async getProductPriceHistory(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        priceMin: true,
        offerLink: true,
        pricePoints: {
          orderBy: { recordedAt: 'asc' },
          take: 60,
        },
      },
    });
    if (!product) return null;
    return {
      ...product,
      priceMin: product.priceMin != null ? Number(product.priceMin) : null,
      history: product.pricePoints.map((p) => ({
        id: p.id,
        priceMin: Number(p.priceMin),
        priceMax: p.priceMax != null ? Number(p.priceMax) : null,
        recordedAt: p.recordedAt,
      })),
    };
  }

  async listAutomations() {
    return prisma.automationRule.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { group: { select: { id: true, name: true } } },
    });
  }

  async createAutomation(input: {
    name: string;
    logic?: string;
    conditions: unknown;
    action?: string;
    groupId?: string;
    priority?: number;
    isActive?: boolean;
  }) {
    return prisma.automationRule.create({
      data: {
        name: input.name,
        logic: input.logic ?? 'and',
        conditions: input.conditions as object,
        action: input.action ?? 'send_whatsapp',
        groupId: input.groupId,
        priority: input.priority ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateAutomation(
    id: string,
    data: { isActive?: boolean; name?: string; priority?: number },
  ) {
    return prisma.automationRule.update({ where: { id }, data });
  }

  async listScheduledPosts(from?: Date, to?: Date) {
    return prisma.scheduledPost.findMany({
      where: {
        scheduledAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        product: { select: { id: true, name: true, imageUrl: true } },
        group: { select: { id: true, name: true } },
      },
    });
  }

  async createScheduledPost(input: {
    title: string;
    scheduledAt: string;
    productId?: string;
    groupId?: string;
    messageText?: string;
    imageUrl?: string;
    offerLink?: string;
  }) {
    return prisma.scheduledPost.create({
      data: {
        title: input.title,
        scheduledAt: new Date(input.scheduledAt),
        productId: input.productId,
        groupId: input.groupId,
        messageText: input.messageText,
        imageUrl: input.imageUrl,
        offerLink: input.offerLink,
        status: 'pending',
      },
    });
  }
}
