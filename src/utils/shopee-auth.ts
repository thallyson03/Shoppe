/**
 * Autenticação HMAC-SHA256 da Shopee Affiliate Open API.
 *
 * Header:
 *   Authorization: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={Signature}
 *
 * Signature = SHA256(AppId + Timestamp + Payload + Secret)
 * Timestamp em segundos (Unix).
 */

import { createHash } from 'node:crypto';

export interface ShopeeAuthHeader {
  Authorization: string;
  'Content-Type': string;
}

/**
 * Gera o header Authorization exigido pela Open API.
 * @param appId  Credencial pública do afiliado
 * @param secret Chave secreta (nunca logar)
 * @param payload Body JSON serializado (mesma string enviada no POST)
 */
export function buildShopeeAuthHeader(
  appId: string,
  secret: string,
  payload: string,
  timestampSeconds?: number,
): ShopeeAuthHeader {
  const timestamp = timestampSeconds ?? Math.floor(Date.now() / 1000);
  const signatureBase = `${appId}${timestamp}${payload}${secret}`;
  const signature = createHash('sha256').update(signatureBase, 'utf8').digest('hex');

  return {
    Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    'Content-Type': 'application/json',
  };
}
