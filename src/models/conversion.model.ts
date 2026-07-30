/**
 * Tipos do conversionReport (Shopee Affiliate GraphQL).
 */

export interface ShopeeConversionNode {
  conversionId: string | number;
  purchaseTime: number | string;
  clickTime?: number | string | null;
  totalCommission?: string | number | null;
  sellerCommission?: string | number | null;
  shopeeCommissionCapped?: string | number | null;
  buyerType?: string | null;
  device?: string | null;
  utmContent?: string | null;
  orders?: Array<{
    orderId?: string | number;
    orderStatus?: string | null;
    items?: Array<{
      itemId?: string | number | null;
      itemName?: string | null;
      shopName?: string | null;
      itemPrice?: string | number | null;
      qty?: number | null;
      itemTotalCommission?: string | number | null;
      completeTime?: number | string | null;
      attributionType?: string | null;
    }>;
  }>;
}

export interface NormalizedConversion {
  conversionId: string;
  purchaseTime: Date;
  clickTime: Date | null;
  totalCommission: number;
  sellerCommission: number | null;
  shopeeCommission: number | null;
  buyerType: string | null;
  device: string | null;
  utmContent: string | null;
  orderStatus: string | null;
  items: Array<{
    orderId: string;
    itemId: string | null;
    itemName: string | null;
    shopName: string | null;
    itemPrice: number | null;
    qty: number;
    itemTotalCommission: number | null;
    orderStatus: string | null;
    completeTime: Date | null;
  }>;
}

export interface FetchConversionReportParams {
  purchaseTimeStart: number;
  purchaseTimeEnd: number;
  /** DisplayOrderStatus: ALL | UNPAID | PENDING | COMPLETED | CANCELLED */
  orderStatus?: string;
  limit?: number;
  scrollId?: string;
}
