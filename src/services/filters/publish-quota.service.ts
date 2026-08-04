/**
 * Controle de frequência e cota de publicações no WhatsApp.
 *
 * - Cron consulta a API a cada 5 min
 * - Máx. 1 envio por minuto
 * - Máx. 50 envios por dia
 * - Manhã / tarde / noite com cotas (sobras rolam para o próximo período)
 */

import { env } from '../../config/env.js';
import { OfferRepository } from '../../repositories/offer.repository.js';
import { logger } from '../../utils/logger.js';

export type DayPeriod = 'morning' | 'afternoon' | 'night' | 'closed';

export interface QuotaDecision {
  allowed: boolean;
  reason: string;
  period: DayPeriod;
  publishedToday: number;
  publishedInPeriod: number;
  periodLimit: number;
  dailyLimit: number;
  msUntilNextSlot: number;
}

export class PublishQuotaService {
  constructor(
    private readonly offerRepository: OfferRepository = new OfferRepository(),
    private readonly timezone: string = env.PUBLISH_TIMEZONE,
    private readonly dailyLimit: number = env.PUBLISH_MAX_PER_DAY,
    private readonly minIntervalMs: number = env.PUBLISH_MIN_INTERVAL_MS,
  ) {}

  async evaluate(now = new Date()): Promise<QuotaDecision> {
    const period = this.resolvePeriod(now);
    const dayRange = this.getDayRange(now);
    const publishedToday = await this.offerRepository.countPublishedBetween(
      dayRange.start,
      dayRange.end,
    );

    if (period === 'closed') {
      return this.deny('Fora da janela de envio (manhã/tarde/noite)', period, publishedToday, 0, 0);
    }

    if (publishedToday >= this.dailyLimit) {
      return this.deny(
        `Limite diário atingido (${this.dailyLimit})`,
        period,
        publishedToday,
        0,
        0,
      );
    }

    const periodRange = this.getPeriodRange(now, period);
    const publishedInPeriod = await this.offerRepository.countPublishedBetween(
      periodRange.start,
      periodRange.end,
    );
    const periodLimit = await this.resolvePeriodLimit(period, dayRange);

    if (publishedInPeriod >= periodLimit) {
      return this.deny(
        `Limite do período ${period} atingido (${periodLimit})`,
        period,
        publishedToday,
        publishedInPeriod,
        periodLimit,
      );
    }

    const lastPublishedAt = await this.offerRepository.findLastPublishedAt();
    if (lastPublishedAt) {
      const elapsed = now.getTime() - lastPublishedAt.getTime();
      if (elapsed < this.minIntervalMs) {
        const msUntilNextSlot = this.minIntervalMs - elapsed;
        return {
          allowed: false,
          reason: `Aguardar intervalo mínimo (${Math.ceil(this.minIntervalMs / 1000)}s)`,
          period,
          publishedToday,
          publishedInPeriod,
          periodLimit,
          dailyLimit: this.dailyLimit,
          msUntilNextSlot,
        };
      }
    }

    logger.debug(
      { period, publishedToday, publishedInPeriod, periodLimit, dailyLimit: this.dailyLimit },
      'Cota de publicação OK',
    );

    return {
      allowed: true,
      reason: 'ok',
      period,
      publishedToday,
      publishedInPeriod,
      periodLimit,
      dailyLimit: this.dailyLimit,
      msUntilNextSlot: 0,
    };
  }

  resolvePeriod(now = new Date()): DayPeriod {
    const hour = this.getHourInTimezone(now);

    if (hour >= env.PUBLISH_MORNING_START && hour < env.PUBLISH_AFTERNOON_START) {
      return 'morning';
    }
    if (hour >= env.PUBLISH_AFTERNOON_START && hour < env.PUBLISH_NIGHT_START) {
      return 'afternoon';
    }
    if (hour >= env.PUBLISH_NIGHT_START && hour < env.PUBLISH_NIGHT_END) {
      return 'night';
    }

    return 'closed';
  }

  /**
   * Manhã: cota base.
   * Tarde: base + sobra da manhã.
   * Noite: base + sobras da manhã e tarde (para chegar perto de 50/dia).
   */
  private async resolvePeriodLimit(
    period: Exclude<DayPeriod, 'closed'>,
    dayRange: { start: Date; end: Date },
  ): Promise<number> {
    const morningLimit = env.PUBLISH_MORNING_LIMIT;
    const afternoonLimit = env.PUBLISH_AFTERNOON_LIMIT;
    const nightLimit = env.PUBLISH_NIGHT_LIMIT;

    if (period === 'morning') {
      return morningLimit;
    }

    const morningRange = this.buildRangeForHours(
      dayRange.start,
      env.PUBLISH_MORNING_START,
      env.PUBLISH_AFTERNOON_START,
    );
    const morningUsed = await this.offerRepository.countPublishedBetween(
      morningRange.start,
      morningRange.end,
    );
    const morningLeftover = Math.max(0, morningLimit - morningUsed);

    if (period === 'afternoon') {
      return afternoonLimit + morningLeftover;
    }

    const afternoonRange = this.buildRangeForHours(
      dayRange.start,
      env.PUBLISH_AFTERNOON_START,
      env.PUBLISH_NIGHT_START,
    );
    const afternoonUsed = await this.offerRepository.countPublishedBetween(
      afternoonRange.start,
      afternoonRange.end,
    );
    const afternoonLeftover = Math.max(0, afternoonLimit - afternoonUsed);

    return nightLimit + morningLeftover + afternoonLeftover;
  }

  private deny(
    reason: string,
    period: DayPeriod,
    publishedToday: number,
    publishedInPeriod: number,
    periodLimit: number,
  ): QuotaDecision {
    return {
      allowed: false,
      reason,
      period,
      publishedToday,
      publishedInPeriod,
      periodLimit,
      dailyLimit: this.dailyLimit,
      msUntilNextSlot: 0,
    };
  }

  private getHourInTimezone(date: Date): number {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date);
    return Number(hourStr);
  }

  private getDateParts(date: Date): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return { year: get('year'), month: get('month'), day: get('day') };
  }

  private zonedTimeToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute = 0,
    second = 0,
  ): Date {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const asLocal = new Date(utcGuess.toLocaleString('en-US', { timeZone: this.timezone }));
    const diff = utcGuess.getTime() - asLocal.getTime();
    return new Date(utcGuess.getTime() + diff);
  }

  private getDayRange(now: Date): { start: Date; end: Date } {
    const { year, month, day } = this.getDateParts(now);
    const start = this.zonedTimeToUtc(year, month, day, 0, 0, 0);
    // dia seguinte via Date.UTC para lidar com fim de mês
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    const end = this.zonedTimeToUtc(
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate(),
      0,
      0,
      0,
    );
    return { start, end };
  }

  private getPeriodRange(
    now: Date,
    period: Exclude<DayPeriod, 'closed'>,
  ): { start: Date; end: Date } {
    const dayRange = this.getDayRange(now);
    if (period === 'morning') {
      return this.buildRangeForHours(
        dayRange.start,
        env.PUBLISH_MORNING_START,
        env.PUBLISH_AFTERNOON_START,
      );
    }
    if (period === 'afternoon') {
      return this.buildRangeForHours(
        dayRange.start,
        env.PUBLISH_AFTERNOON_START,
        env.PUBLISH_NIGHT_START,
      );
    }
    return this.buildRangeForHours(dayRange.start, env.PUBLISH_NIGHT_START, env.PUBLISH_NIGHT_END);
  }

  private buildRangeForHours(
    dayStart: Date,
    startHour: number,
    endHour: number,
  ): { start: Date; end: Date } {
    const { year, month, day } = this.getDateParts(dayStart);
    const start = this.zonedTimeToUtc(year, month, day, startHour, 0, 0);
    if (endHour >= 24) {
      const next = new Date(Date.UTC(year, month - 1, day + 1));
      const end = this.zonedTimeToUtc(
        next.getUTCFullYear(),
        next.getUTCMonth() + 1,
        next.getUTCDate(),
        0,
        0,
        0,
      );
      return { start, end };
    }
    const end = this.zonedTimeToUtc(year, month, day, endHour, 0, 0);
    return { start, end };
  }
}
