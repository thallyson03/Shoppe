/**
 * Contratos de domínio e DTOs da aplicação.
 * Separados da camada de infraestrutura (Prisma) para respeitar SOLID.
 */

/** Oferta bruta retornada pela GraphQL productOfferV2 */
export interface ShopeeProductOffer {
  itemId: number | string;
  productName: string;
  productLink?: string | null;
  offerLink: string;
  imageUrl?: string | null;
  priceMin?: number | string | null;
  priceMax?: number | string | null;
  priceDiscountRate?: number | null;
  sales?: number | null;
  ratingStar?: number | string | null;
  commissionRate?: string | null;
  sellerCommissionRate?: string | null;
  shopeeCommissionRate?: string | null;
  commission?: number | string | null;
  shopId?: number | string | null;
  shopName?: string | null;
  shopType?: number[] | null;
  periodStartTime?: number | null;
  periodEndTime?: number | null;
}

/** Oferta normalizada para uso interno (números tipados) */
export interface NormalizedOffer {
  itemId: string;
  shopId: string | null;
  productName: string;
  productLink: string | null;
  offerLink: string;
  imageUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  priceDiscountRate: number | null;
  sales: number | null;
  ratingStar: number | null;
  commissionRate: number | null;
  sellerCommissionRate: number | null;
  shopeeCommissionRate: number | null;
  shopName: string | null;
}

/** Resultado de um ciclo completo do pipeline */
export interface PipelineResult {
  fetchedCount: number;
  filteredCount: number;
  newOffersCount: number;
  publishedCount: number;
}

/** Payload de envio de texto na Evolution API */
export interface EvolutionSendTextPayload {
  number: string;
  text: string;
  delay?: number;
  linkPreview?: boolean;
}

/** Payload de envio de mídia (imagem do produto) */
export interface EvolutionSendMediaPayload {
  number: string;
  mediaUrl: string;
  caption: string;
  fileName?: string;
  delay?: number;
}

/** Resposta simplificada da Evolution após sendText/sendMedia */
export interface EvolutionSendTextResult {
  messageId: string | null;
  raw: unknown;
}

/** Critérios de filtro configuráveis */
export interface OfferFilterCriteria {
  minCommissionRate: number;
  minDiscountRate: number;
  minRating: number;
  minSales: number;
  maxOffersPerRun: number;
}
