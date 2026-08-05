/**
 * Catálogo público — busca ao vivo na Shopee (productOfferV2) com link afiliado.
 */

import type { NormalizedOffer } from '../../models/offer.model.js';
import { logger } from '../../utils/logger.js';
import { ShopeeOfferService } from '../shopee/index.js';
import { ProductSyncService } from './product-sync.service.js';

export type CatalogSort =
  | 'relevance'
  | 'sales'
  | 'price_asc'
  | 'price_desc'
  | 'commission'
  | 'rating';

export interface PublicCatalogQuery {
  q?: string;
  page?: number;
  limit?: number;
  sort?: CatalogSort;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  categoryId?: number;
}

export interface PublicCatalogItem {
  itemId: string;
  name: string;
  imageUrl: string | null;
  offerLink: string;
  priceMin: number | null;
  priceMax: number | null;
  priceDiscountRate: number | null;
  sales: number | null;
  ratingStar: number | null;
  shopName: string | null;
}

export interface PublicCatalogResponse {
  page: number;
  limit: number;
  hasNextPage: boolean;
  items: PublicCatalogItem[];
}

function mapSort(sort: CatalogSort | undefined): { listType: number; sortType: number } {
  switch (sort) {
    case 'sales':
      return { listType: 0, sortType: 2 };
    case 'price_desc':
      return { listType: 0, sortType: 3 };
    case 'price_asc':
      return { listType: 0, sortType: 4 };
    case 'commission':
      return { listType: 1, sortType: 5 };
    case 'rating':
      // API não ordena por rating — buscamos por vendas e reordenamos localmente
      return { listType: 0, sortType: 2 };
    case 'relevance':
    default:
      return { listType: 0, sortType: 1 };
  }
}

function toPublicItem(offer: NormalizedOffer): PublicCatalogItem {
  return {
    itemId: offer.itemId,
    name: offer.productName,
    imageUrl: offer.imageUrl,
    offerLink: offer.offerLink,
    priceMin: offer.priceMin,
    priceMax: offer.priceMax,
    priceDiscountRate: offer.priceDiscountRate,
    sales: offer.sales,
    ratingStar: offer.ratingStar,
    shopName: offer.shopName,
  };
}

export class PublicCatalogService {
  constructor(
    private readonly shopee: ShopeeOfferService = new ShopeeOfferService(),
    private readonly productSync: ProductSyncService = new ProductSyncService(),
  ) {}

  async search(query: PublicCatalogQuery = {}): Promise<PublicCatalogResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 24), 50);
    const keyword = query.q?.trim() || undefined;
    const { listType, sortType } = mapSort(query.sort);

    const result = await this.shopee.getOffersPage({
      keyword: keyword ?? '',
      listType,
      sortType,
      page,
      limit,
      productCatId: query.categoryId,
    });

    let items = result.items;

    if (query.minPrice != null) {
      items = items.filter((o) => o.priceMin != null && o.priceMin >= query.minPrice!);
    }
    if (query.maxPrice != null) {
      items = items.filter((o) => o.priceMin != null && o.priceMin <= query.maxPrice!);
    }
    if (query.minRating != null) {
      items = items.filter((o) => o.ratingStar != null && o.ratingStar >= query.minRating!);
    }
    if (query.minDiscount != null) {
      items = items.filter(
        (o) => o.priceDiscountRate != null && o.priceDiscountRate >= query.minDiscount!,
      );
    }

    if (query.sort === 'rating') {
      items = [...items].sort((a, b) => (b.ratingStar ?? 0) - (a.ratingStar ?? 0));
    }

    // Sync em background — não bloqueia a resposta pública
    void this.productSync.syncMany(result.items).catch((err) => {
      logger.warn({ err }, 'Sync catálogo público falhou (ignorado)');
    });

    return {
      page: result.page,
      limit: result.limit,
      hasNextPage: result.hasNextPage,
      items: items.map(toPublicItem),
    };
  }
}
