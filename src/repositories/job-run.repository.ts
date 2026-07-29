/**
 * Repositório de logs de publicação e execuções do job.
 */

import type { JobRun, PublishLog } from '@prisma/client';
import { prisma } from '../database/prisma.js';

export class PublishLogRepository {
  async create(params: {
    offerId: string;
    groupJid: string;
    evolutionMsgId?: string | null;
    status?: string;
    errorMessage?: string | null;
  }): Promise<PublishLog> {
    return prisma.publishLog.create({
      data: {
        offerId: params.offerId,
        groupJid: params.groupJid,
        evolutionMsgId: params.evolutionMsgId ?? null,
        status: params.status ?? 'sent',
        errorMessage: params.errorMessage ?? null,
      },
    });
  }
}

export class JobRunRepository {
  async start(): Promise<JobRun> {
    return prisma.jobRun.create({
      data: { status: 'running' },
    });
  }

  async finish(
    id: string,
    data: {
      status: 'success' | 'error' | 'partial';
      fetchedCount: number;
      filteredCount: number;
      newOffersCount: number;
      publishedCount: number;
      errorMessage?: string | null;
    },
  ): Promise<JobRun> {
    return prisma.jobRun.update({
      where: { id },
      data: {
        ...data,
        finishedAt: new Date(),
      },
    });
  }

  async findRecent(limit = 10): Promise<JobRun[]> {
    return prisma.jobRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
