/**
 * Cliente Evolution API — envio de mensagens WhatsApp para grupos.
 *
 * Endpoint: POST /message/sendText/{instance}
 * Header: apikey
 * Body: { number: groupJid, text, delay?, linkPreview? }
 */

import axios, { type AxiosInstance } from 'axios';
import { env } from '../../config/env.js';
import type {
  EvolutionSendTextPayload,
  EvolutionSendTextResult,
} from '../../models/offer.model.js';
import { EvolutionApiError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class EvolutionClient {
  private readonly http: AxiosInstance;

  constructor(
    baseUrl: string = env.EVOLUTION_API_URL,
    private readonly apiKey: string = env.EVOLUTION_API_KEY,
    private readonly instance: string = env.EVOLUTION_INSTANCE,
  ) {
    this.http = axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      timeout: 30_000,
      headers: {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Envia texto para um número ou JID de grupo (@g.us).
   */
  async sendText(payload: EvolutionSendTextPayload): Promise<EvolutionSendTextResult> {
    const path = `/message/sendText/${encodeURIComponent(this.instance)}`;

    try {
      logger.info(
        { number: payload.number, textLength: payload.text.length },
        'Enviando mensagem via Evolution API',
      );

      const response = await this.http.post(path, {
        number: payload.number,
        text: payload.text,
        delay: payload.delay ?? env.EVOLUTION_SEND_DELAY_MS,
        linkPreview: payload.linkPreview ?? true,
      });

      const messageId =
        (response.data as { key?: { id?: string } })?.key?.id ??
        (response.data as { messageId?: string })?.messageId ??
        null;

      return { messageId, raw: response.data };
    } catch (error) {
      const detail =
        axios.isAxiosError(error) && error.response
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error instanceof Error
            ? error.message
            : 'Erro desconhecido';

      logger.error({ err: error }, 'Falha ao enviar mensagem Evolution');
      throw new EvolutionApiError(`Falha Evolution API: ${detail}`, error);
    }
  }

  /** Consulta estado da conexão da instância (health) */
  async getConnectionState(): Promise<string> {
    try {
      const response = await this.http.get(
        `/instance/connectionState/${encodeURIComponent(this.instance)}`,
      );
      const state =
        (response.data as { instance?: { state?: string }; state?: string })?.instance?.state ??
        (response.data as { state?: string })?.state ??
        'unknown';
      return state;
    } catch (error) {
      logger.warn({ err: error }, 'Não foi possível obter connectionState da Evolution');
      return 'unreachable';
    }
  }
}

export class EvolutionMessageService {
  constructor(
    private readonly client: EvolutionClient = new EvolutionClient(),
    private readonly groupJid: string = env.EVOLUTION_GROUP_JID,
  ) {}

  async sendToGroup(text: string): Promise<EvolutionSendTextResult> {
    return this.client.sendText({
      number: this.groupJid,
      text,
      linkPreview: true,
    });
  }

  async getStatus(): Promise<string> {
    return this.client.getConnectionState();
  }
}
