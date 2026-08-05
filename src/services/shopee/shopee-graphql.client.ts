/**
 * Cliente GraphQL da Shopee Affiliate Open API.
 *
 * - productOfferV2 (ofertas)
 * - conversionReport (Fase 3)
 */

import axios, { type AxiosInstance } from 'axios';
import { env } from '../../config/env.js';
import type {
  FetchConversionReportParams,
  NormalizedConversion,
  ShopeeConversionNode,
} from '../../models/conversion.model.js';
import type { NormalizedOffer, ShopeeProductOffer } from '../../models/offer.model.js';
import { ShopeeApiError } from '../../utils/errors.js';
import { toIdString, toNumber } from '../../utils/format.js';
import { logger } from '../../utils/logger.js';
import { buildShopeeAuthHeader } from '../../utils/shopee-auth.js';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: number; message?: string } }>;
}

interface ProductOfferV2Data {
  productOfferV2: {
    nodes: ShopeeProductOffer[];
    pageInfo: {
      page: number;
      limit: number;
      hasNextPage: boolean;
    };
  };
}

interface ConversionReportData {
  conversionReport: {
    nodes: ShopeeConversionNode[];
    pageInfo: {
      limit: number;
      hasNextPage: boolean;
      scrollId?: string | null;
    };
  };
}

export interface FetchProductOffersParams {
  keyword?: string;
  listType?: number;
  sortType?: number;
  page?: number;
  limit?: number;
  /** ID de categoria Shopee (productCatId) */
  productCatId?: number;
}

export interface ProductOffersPage {
  items: NormalizedOffer[];
  page: number;
  limit: number;
  hasNextPage: boolean;
}

function parseMoney(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseUnix(value: number | string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n > 1e12 ? n : n * 1000);
}

export class ShopeeAuthService {
  async validateCredentials(client: ShopeeGraphQLClient): Promise<boolean> {
    const offers = await client.fetchProductOffers({ page: 1, limit: 1 });
    return Array.isArray(offers);
  }
}

export class ShopeeGraphQLClient {
  private readonly http: AxiosInstance;

  constructor(
    private readonly appId: string = env.SHOPEE_APP_ID,
    private readonly secret: string = env.SHOPEE_SECRET,
    baseUrl: string = env.SHOPEE_GRAPHQL_URL,
  ) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
    });
  }

  async execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const body: Record<string, unknown> = { query };
    if (variables && Object.keys(variables).length > 0) {
      body.variables = variables;
    }

    const payload = JSON.stringify(body);
    const headers = buildShopeeAuthHeader(this.appId, this.secret, payload);

    try {
      const response = await this.http.post<GraphQLResponse<T>>('', body, { headers });
      const { data, errors } = response.data;

      if (errors?.length) {
        const msg = errors.map((e) => e.extensions?.message ?? e.message).join('; ');
        throw new ShopeeApiError(`GraphQL error: ${msg}`, errors);
      }

      if (!data) {
        throw new ShopeeApiError('Resposta GraphQL sem campo data');
      }

      return data;
    } catch (error) {
      if (error instanceof ShopeeApiError) {
        throw error;
      }

      const axiosMsg =
        axios.isAxiosError(error) && error.response
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error instanceof Error
            ? error.message
            : 'Erro desconhecido';

      logger.error({ err: error }, 'Falha na chamada Shopee GraphQL');
      throw new ShopeeApiError(`Falha ao consultar Shopee API: ${axiosMsg}`, error);
    }
  }

  async fetchProductOffers(params: FetchProductOffersParams = {}): Promise<NormalizedOffer[]> {
    const page = await this.fetchProductOffersPage(params);
    return page.items;
  }

  async fetchProductOffersPage(
    params: FetchProductOffersParams = {},
  ): Promise<ProductOffersPage> {
    const keyword = params.keyword ?? env.SHOPEE_KEYWORD;
    const listType = params.listType ?? env.SHOPEE_LIST_TYPE;
    const sortType = params.sortType ?? env.SHOPEE_SORT_TYPE;
    const page = params.page ?? 1;
    const limit = params.limit ?? env.SHOPEE_PAGE_LIMIT;

    const keywordArg = keyword ? `keyword: ${JSON.stringify(keyword)},` : '';
    const catArg =
      params.productCatId != null && Number.isFinite(params.productCatId)
        ? `productCatId: ${params.productCatId},`
        : '';

    const query = `{
      productOfferV2(
        ${keywordArg}
        ${catArg}
        listType: ${listType},
        sortType: ${sortType},
        page: ${page},
        limit: ${limit}
      ) {
        nodes {
          itemId
          productName
          productLink
          offerLink
          imageUrl
          priceMin
          priceMax
          priceDiscountRate
          sales
          ratingStar
          commissionRate
          sellerCommissionRate
          shopeeCommissionRate
          commission
          shopId
          shopName
          shopType
          periodStartTime
          periodEndTime
        }
        pageInfo {
          page
          limit
          hasNextPage
        }
      }
    }`;

    logger.info(
      {
        keyword: keyword || null,
        listType,
        sortType,
        page,
        limit,
        productCatId: params.productCatId ?? null,
      },
      'Buscando ofertas na Shopee',
    );

    const data = await this.execute<ProductOfferV2Data>(query);
    const nodes = data.productOfferV2?.nodes ?? [];
    const pageInfo = data.productOfferV2?.pageInfo;

    return {
      items: nodes.map((node) => this.normalize(node)).filter((o) => o.itemId && o.offerLink),
      page: pageInfo?.page ?? page,
      limit: pageInfo?.limit ?? limit,
      hasNextPage: Boolean(pageInfo?.hasNextPage),
    };
  }

  async fetchConversionReportPage(
    params: FetchConversionReportParams,
  ): Promise<{ nodes: NormalizedConversion[]; hasNextPage: boolean; scrollId: string | null }> {
    const limit = params.limit ?? 50;
    const status = params.orderStatus ?? 'ALL';
    const scrollArg = params.scrollId ? `scrollId: ${JSON.stringify(params.scrollId)},` : '';

    const query = `{
      conversionReport(
        purchaseTimeStart: ${params.purchaseTimeStart},
        purchaseTimeEnd: ${params.purchaseTimeEnd},
        orderStatus: ${status},
        limit: ${limit},
        ${scrollArg}
      ) {
        nodes {
          purchaseTime
          clickTime
          conversionId
          totalCommission
          sellerCommission
          shopeeCommissionCapped
          buyerType
          device
          utmContent
          orders {
            orderId
            orderStatus
            items {
              itemId
              itemName
              shopName
              itemPrice
              qty
              itemTotalCommission
              completeTime
              attributionType
            }
          }
        }
        pageInfo {
          limit
          hasNextPage
          scrollId
        }
      }
    }`;

    const data = await this.execute<ConversionReportData>(query);
    const report = data.conversionReport;
    const nodes = (report?.nodes ?? []).map((n) => this.normalizeConversion(n));

    return {
      nodes,
      hasNextPage: Boolean(report?.pageInfo?.hasNextPage),
      scrollId: report?.pageInfo?.scrollId ?? null,
    };
  }

  async fetchAllConversions(
    params: Omit<FetchConversionReportParams, 'scrollId'>,
    maxPages = 20,
  ): Promise<NormalizedConversion[]> {
    const all: NormalizedConversion[] = [];
    let scrollId: string | undefined;
    let page = 0;

    while (page < maxPages) {
      page += 1;
      const result = await this.fetchConversionReportPage({
        ...params,
        ...(scrollId ? { scrollId } : {}),
      });
      all.push(...result.nodes);
      if (!result.hasNextPage || !result.scrollId) break;
      scrollId = result.scrollId;
    }

    return all;
  }

  private normalize(raw: ShopeeProductOffer): NormalizedOffer {
    return {
      itemId: toIdString(raw.itemId),
      shopId: raw.shopId != null ? toIdString(raw.shopId) : null,
      productName: raw.productName?.trim() || 'Produto sem nome',
      productLink: raw.productLink ?? null,
      offerLink: raw.offerLink,
      imageUrl: raw.imageUrl ?? null,
      priceMin: toNumber(raw.priceMin),
      priceMax: toNumber(raw.priceMax),
      priceDiscountRate: toNumber(raw.priceDiscountRate),
      sales: toNumber(raw.sales),
      ratingStar: toNumber(raw.ratingStar),
      commissionRate: toNumber(raw.commissionRate),
      sellerCommissionRate: toNumber(raw.sellerCommissionRate),
      shopeeCommissionRate: toNumber(raw.shopeeCommissionRate),
      shopName: raw.shopName ?? null,
    };
  }

  private normalizeConversion(raw: ShopeeConversionNode): NormalizedConversion {
    const items: NormalizedConversion['items'] = [];
    let orderStatus: string | null = null;

    for (const order of raw.orders ?? []) {
      if (!orderStatus && order.orderStatus) orderStatus = order.orderStatus;
      const orderId = toIdString(order.orderId ?? 'unknown');
      for (const item of order.items ?? []) {
        items.push({
          orderId,
          itemId: item.itemId != null ? toIdString(item.itemId) : null,
          itemName: item.itemName ?? null,
          shopName: item.shopName ?? null,
          itemPrice: parseMoney(item.itemPrice ?? null),
          qty: item.qty ?? 1,
          itemTotalCommission: parseMoney(item.itemTotalCommission ?? null),
          orderStatus: order.orderStatus ?? null,
          completeTime: parseUnix(item.completeTime ?? null),
        });
      }
    }

    return {
      conversionId: toIdString(raw.conversionId),
      purchaseTime: parseUnix(raw.purchaseTime) ?? new Date(0),
      clickTime: parseUnix(raw.clickTime ?? null),
      totalCommission: parseMoney(raw.totalCommission) ?? 0,
      sellerCommission: parseMoney(raw.sellerCommission ?? null),
      shopeeCommission: parseMoney(raw.shopeeCommissionCapped ?? null),
      buyerType: raw.buyerType ?? null,
      device: raw.device ?? null,
      utmContent: raw.utmContent ?? null,
      orderStatus,
      items,
    };
  }
}

export class ShopeeOfferService {
  constructor(private readonly client: ShopeeGraphQLClient = new ShopeeGraphQLClient()) {}

  async getOffers(params?: FetchProductOffersParams): Promise<NormalizedOffer[]> {
    return this.client.fetchProductOffers(params);
  }

  async getOffersPage(params?: FetchProductOffersParams): Promise<ProductOffersPage> {
    return this.client.fetchProductOffersPage(params);
  }
}
