/**
 * Camada de serviço Shopee — reexporta o client e o service principal.
 */

export {
  ShopeeAuthService,
  ShopeeGraphQLClient,
  ShopeeOfferService,
  type FetchProductOffersParams,
} from './shopee-graphql.client.js';

export type { FetchShopeeOffersParams, NormalizedPromo } from '../../models/promo.model.js';
