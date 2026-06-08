import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCostUsd } from '@emdr42/ai-providers';

export interface RecordUsageInput {
  userId?: string;
  sessionId?: string;
  provider: string;
  providerType: 'LLM' | 'TTS' | 'STT';
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  chars?: number;
  durationMs?: number;
}

/**
 * UsageService (#130).
 *
 * Пишет UsageLog записи с рассчитанным costUsd.
 * Позволяет строить аналитику по провайдерам/пользователям/сессиям.
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordUsageInput): Promise<void> {
    try {
      const costUsd = calculateCostUsd({
        type: input.providerType,
        providerOrModel: input.model ?? input.provider,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        chars: input.chars,
        durationSec: input.durationMs ? input.durationMs / 1000 : undefined,
      });

      await this.prisma.usageLog.create({
        data: {
          userId: input.userId,
          sessionId: input.sessionId,
          provider: input.provider,
          providerType: input.providerType,
          model: input.model,
          inputTokens: input.inputTokens ?? 0,
          outputTokens: input.outputTokens ?? 0,
          durationMs: input.durationMs,
          costUsd,
        },
      });
    } catch (err) {
      this.logger.error('Failed to record usage', err);
      // Не блокируем главный flow
    }
  }

  async getUserCosts(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await this.prisma.usageLog.findMany({
      where: { userId, timestamp: { gte: since } },
    });

    const byProvider: Record<string, { totalCost: number; count: number }> = {};
    let totalCost = 0;
    for (const log of logs) {
      totalCost += log.costUsd;
      const key = `${log.providerType}:${log.provider}`;
      byProvider[key] = byProvider[key] ?? { totalCost: 0, count: 0 };
      byProvider[key].totalCost += log.costUsd;
      byProvider[key].count += 1;
    }

    return {
      userId,
      periodDays: days,
      totalCostUsd: +totalCost.toFixed(4),
      byProvider,
      totalEvents: logs.length,
    };
  }

  async getSessionCost(sessionId: string) {
    const logs = await this.prisma.usageLog.findMany({
      where: { sessionId },
    });

    const totalCost = logs.reduce(
      (sum: number, log: { costUsd: number }) => sum + log.costUsd,
      0,
    );

    return {
      sessionId,
      totalCostUsd: +totalCost.toFixed(4),
      events: logs.length,
    };
  }

  /**
   * Защита IDOR: только владелец сессии или ADMIN видит её стоимость.
   * THERAPIST с активным TherapistPatient к владельцу тоже допускается.
   */
  async ensureSessionAccess(
    sessionId: string,
    currentUserId: string,
    currentRole: string,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, deletedAt: true },
    });
    if (!session || session.deletedAt) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId === currentUserId || currentRole === 'ADMIN') {
      return;
    }
    if (currentRole === 'THERAPIST') {
      const rel = await this.prisma.therapistPatient.findUnique({
        where: {
          therapistId_patientId: {
            therapistId: currentUserId,
            patientId: session.userId,
          },
        },
        select: { status: true },
      });
      if (rel && rel.status !== 'DISCHARGED') return;
    }
    throw new ForbiddenException('No access to this session');
  }
}
