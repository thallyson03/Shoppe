/**
 * Cliente GraphQL da Shopee Affiliate Open API.
 *
 * Responsabilidades (SRP):
 * - Autenticar com HMAC-SHA256
 * - Buscar productOfferV2
 * - Normalizar a resposta para o domínio interno
 */

import axios, { type AxiosInstance } from 'axios';
import { env } from '../../config/env.js';
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

export interface FetchProductOffersParams {
  keyword?: string;
  listType?: number;
  sortType?: number;
  page?: number;
  limit?: number;
}

export class ShopeeAuthService {
  /**
   * Valida credenciais fazendo uma query mínima.
   * Útil no health check / boot.
   */
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
    private readonly baseUrl: string = env.SHOPEE_GRAPHQL_URL,
  ) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
    });
  }

  /**
   * Executa uma query/mutation GraphQL autenticada.
   */
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

  /**
   * Busca ofertas de produtos (productOfferV2).
   */
  async fetchProductOffers(params: FetchProductOffersParams = {}): Promise<NormalizedOffer[]> {
    const keyword = params.keyword ?? env.SHOPEE_KEYWORD;
    const listType = params.listType ?? env.SHOPEE_LIST_TYPE;
    const sortType = params.sortType ?? env.SHOPEE_SORT_TYPE;
    const page = params.page ?? 1;
    const limit = params.limit ?? env.SHOPEE_PAGE_LIMIT;

    // Query inline (API Shopee espera query string; variables nem sempre aceitas em todos os campos)
    const keywordArg = keyword ? `keyword: ${JSON.stringify(keyword)},` : '';

    const query = `{
      productOfferV2(
        ${keywordArg}
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
      { keyword: keyword || null, listType, sortType, page, limit },
      'Buscando ofertas na Shopee',
    );

    const data = await this.execute<ProductOfferV2Data>(query);
    const nodes = data.productOfferV2?.nodes ?? [];

    return nodes.map((node) => this.normalize(node)).filter((o) => o.itemId && o.offerLink);
  }

  /** Normaliza tipos heterogêneos da API para o domínio interno */
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
}

/** Service de alto nível para orquestrar buscas de ofertas */
export class ShopeeOfferService {
  constructor(private readonly client: ShopeeGraphQLClient = new ShopeeGraphQLClient()) {}

  async getOffers(params?: FetchProductOffersParams): Promise<NormalizedOffer[]> {
    return this.client.fetchProductOffers(params);
  }
}
