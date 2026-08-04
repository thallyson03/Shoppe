/**
 * Contratos de promoções Shopee (shopeeOfferV2).
 */

/** Nó bruto retornado pela GraphQL shopeeOfferV2 */
export interface ShopeePlatformOffer {
  commissionRate?: string | null;
  imageUrl?: string | null;
  offerLink: string;
  originalLink?: string | null;
  offerName: string;
  offerType?: number | null;
  categoryId?: number | string | null;
  collectionId?: number | string | null;
  periodStartTime?: number | null;
  periodEndTime?: number | null;
}

/** Promo normalizada para uso interno */
export interface NormalizedPromo {
  offerKey: string;
  offerName: string;
  offerLink: string;
  originalLink: string | null;
  imageUrl: string | null;
  commissionRate: number | null;
  offerType: number | null;
  categoryId: string | null;
  collectionId: string | null;
  periodStartTime: Date | null;
  periodEndTime: Date | null;
}

export interface FetchShopeeOffersParams {
  keyword?: string;
  sortType?: number;
  page?: number;
  limit?: number;
}

export interface PromoSyncResult {
  fetched: number;
  upserted: number;
  skippedExpired: number;
}
