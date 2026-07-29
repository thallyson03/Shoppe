/**
 * Erros de domínio tipados para tratamento consistente nas camadas superiores.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ShopeeApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SHOPEE_API_ERROR', 502, cause);
    this.name = 'ShopeeApiError';
  }
}

export class EvolutionApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'EVOLUTION_API_ERROR', 502, cause);
    this.name = 'EvolutionApiError';
  }
}
