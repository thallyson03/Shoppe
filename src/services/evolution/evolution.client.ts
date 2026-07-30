/**
 * Cliente Evolution API — envio de mensagens WhatsApp para grupos.
 *
 * Endpoints:
 * - POST /message/sendText/{instance}
 * - POST /message/sendMedia/{instance}  (imagem do produto + caption)
 */

import axios, { type AxiosInstance } from 'axios';
import { env } from '../../config/env.js';
import type {
  EvolutionSendMediaPayload,
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
      timeout: 45_000,
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
        'Enviando texto via Evolution API',
      );

      const response = await this.http.post(path, {
        number: payload.number,
        text: payload.text,
        delay: payload.delay ?? env.EVOLUTION_SEND_DELAY_MS,
        linkPreview: payload.linkPreview ?? true,
      });

      return this.extractResult(response.data);
    } catch (error) {
      throw this.wrapError(error, 'texto');
    }
  }

  /**
   * Envia imagem (URL da Shopee) com legenda para o grupo.
   * POST /message/sendMedia/{instance}
   */
  async sendImage(payload: EvolutionSendMediaPayload): Promise<EvolutionSendTextResult> {
    const path = `/message/sendMedia/${encodeURIComponent(this.instance)}`;

    try {
      logger.info(
        {
          number: payload.number,
          mediaUrl: payload.mediaUrl,
          captionLength: payload.caption.length,
        },
        'Enviando imagem via Evolution API',
      );

      const response = await this.http.post(path, {
        number: payload.number,
        mediatype: 'image',
        mimetype: 'image/jpeg',
        caption: payload.caption,
        media: payload.mediaUrl,
        fileName: payload.fileName ?? 'produto-shopee.jpg',
        delay: payload.delay ?? env.EVOLUTION_SEND_DELAY_MS,
      });

      return this.extractResult(response.data);
    } catch (error) {
      throw this.wrapError(error, 'imagem');
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

  private extractResult(data: unknown): EvolutionSendTextResult {
    const messageId =
      (data as { key?: { id?: string } })?.key?.id ??
      (data as { messageId?: string })?.messageId ??
      null;
    return { messageId, raw: data };
  }

  private wrapError(error: unknown, kind: string): EvolutionApiError {
    const detail =
      axios.isAxiosError(error) && error.response
        ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
        : error instanceof Error
          ? error.message
          : 'Erro desconhecido';

    logger.error({ err: error }, `Falha ao enviar ${kind} Evolution`);
    return new EvolutionApiError(`Falha Evolution API (${kind}): ${detail}`, error);
  }
}

export class EvolutionMessageService {
  constructor(
    private readonly client: EvolutionClient = new EvolutionClient(),
    private readonly defaultGroupJid: string = env.EVOLUTION_GROUP_JID,
  ) {}

  /**
   * Publica oferta no grupo: imagem + caption quando houver imageUrl;
   * caso contrário, envia apenas texto.
   * @param groupJid opcional — se omitido, usa EVOLUTION_GROUP_JID
   */
  async sendOfferToGroup(
    caption: string,
    imageUrl?: string | null,
    groupJid?: string,
  ): Promise<EvolutionSendTextResult> {
    const number = groupJid ?? this.defaultGroupJid;

    if (imageUrl) {
      try {
        return await this.client.sendImage({
          number,
          mediaUrl: imageUrl,
          caption,
        });
      } catch (error) {
        logger.warn({ err: error, imageUrl, number }, 'Falha ao enviar imagem — fallback para texto');
      }
    }

    return this.client.sendText({
      number,
      text: caption,
      linkPreview: true,
    });
  }

  /** @deprecated Preferir sendOfferToGroup */
  async sendToGroup(text: string): Promise<EvolutionSendTextResult> {
    return this.sendOfferToGroup(text);
  }

  async getStatus(): Promise<string> {
    return this.client.getConnectionState();
  }
}
