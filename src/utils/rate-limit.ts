/**
 * Rate limit simples em memória (por chave / IP).
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/**
 * Retorna true se a requisição deve ser bloqueada.
 */
export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    buckets.set(key, bucket);
    return true;
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return false;
}
