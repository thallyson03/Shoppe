/**
 * Helpers de formatação (moeda, percentuais, texto).
 */

/** Formata valor em Real brasileiro (R$ 1.234,56) */
export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Consulte no app';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Converte taxa decimal da API (ex: "0.0850") para percentual legível (8.5%) */
export function formatCommissionPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) {
    return '—';
  }

  return `${(rate * 100).toFixed(1)}%`;
}

/** Formata desconto inteiro (ex: 35 → 35%) */
export function formatDiscountPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) {
    return '—';
  }

  return `${Math.round(rate)}%`;
}

/** Trunca texto preservando palavras quando possível */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const sliced = text.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const base = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base}…`;
}

/** Converte valores mistos (string/number) vindos da GraphQL para number | null */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Converte ID numérico/string para string estável */
export function toIdString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

/** Delay assíncrono (throttle entre envios) */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
