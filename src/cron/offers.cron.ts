/**
 * Agendamento com node-cron — executa o pipeline a cada 5 minutos (configurável).
 */

import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env.js';
import { OfferPipelineService } from '../services/offer-pipeline.service.js';
import { logger } from '../utils/logger.js';

export class OffersCronJob {
  private task: ScheduledTask | null = null;
  private running = false;

  constructor(private readonly pipeline: OfferPipelineService = new OfferPipelineService()) {}

  start(): void {
    if (!cron.validate(env.CRON_SCHEDULE)) {
      throw new Error(`CRON_SCHEDULE inválido: ${env.CRON_SCHEDULE}`);
    }

    this.task = cron.schedule(env.CRON_SCHEDULE, () => {
      void this.executeSafe();
    });

    logger.info({ schedule: env.CRON_SCHEDULE }, 'Cron de ofertas agendado');

    if (env.CRON_RUN_ON_START) {
      logger.info('Executando pipeline imediatamente (CRON_RUN_ON_START=true)');
      void this.executeSafe();
    }
  }

  stop(): void {
    this.task?.stop();
    this.task = null;
    logger.info('Cron de ofertas interrompido');
  }

  /** Exposto para trigger manual via API */
  async runNow(): Promise<Awaited<ReturnType<OfferPipelineService['run']>>> {
    return this.executeSafe();
  }

  private async executeSafe(): Promise<Awaited<ReturnType<OfferPipelineService['run']>>> {
    if (this.running) {
      logger.warn('Ciclo anterior ainda em execução — pulando este tick');
      return {
        fetchedCount: 0,
        filteredCount: 0,
        newOffersCount: 0,
        publishedCount: 0,
      };
    }

    this.running = true;
    try {
      return await this.pipeline.run();
    } catch (error) {
      // Erro já logado no pipeline; evita derrubar o processo do cron
      logger.error({ err: error }, 'Erro no ciclo do cron');
      return {
        fetchedCount: 0,
        filteredCount: 0,
        newOffersCount: 0,
        publishedCount: 0,
      };
    } finally {
      this.running = false;
    }
  }
}
