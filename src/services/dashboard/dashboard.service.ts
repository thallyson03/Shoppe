/**
 * Métricas e listagens do Dashboard (Fase 1).
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
    ]);

    // Placeholders Fase 1 (conversões reais entram na Fase 3 via conversionReport)
    return {
      kpis: {
        commissionToday: null as number | null,
        commissionMonth: null as number | null,
        clicks: null as number | null,
        conversions: null as number | null,
        productsSentToday: sentToday,
        productsSentMonth: sentMonth,
        productsTotal,
        productsSyncedToday,
        pendingQueue,
        activeCampaigns,
        activeGroups,
        note: 'Comissão/cliques/conversões serão preenchidos na Fase 3 (conversionReport Shopee).',
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
