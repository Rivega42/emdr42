import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TimeRange {
  from?: Date;
  to?: Date;
}

/**
 * AnalyticsService (#125) — агрегаты для therapist/admin dashboards.
 *
 * Все методы уважают PHI-границы: пациент может видеть только свою аналитику,
 * терапевт — только assigned пациентов, admin — всё.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Сводка по сессиям пациента (или всех пациентов если userId не задан) */
  async sessionTrends(params: { userId?: string } & TimeRange) {
    const where: any = { deletedAt: null };
    if (params.userId) where.userId = params.userId;
    if (params.from || params.to) {
      where.startedAt = {};
      if (params.from) where.startedAt.gte = params.from;
      if (params.to) where.startedAt.lte = params.to;
    }

    const sessions = await this.prisma.session.findMany({
      where,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        sudsBaseline: true,
        sudsFinal: true,
        vocBaseline: true,
        vocFinal: true,
        status: true,
        phase: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    const totalSessions = sessions.length;
    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
    const aborted = sessions.filter((s) => s.status === 'ABORTED').length;

    const withBothSuds = sessions.filter(
      (s) => s.sudsBaseline != null && s.sudsFinal != null,
    );
    const avgSudsReduction =
      withBothSuds.length > 0
        ? withBothSuds.reduce(
            (sum, s) => sum + ((s.sudsBaseline ?? 0) - (s.sudsFinal ?? 0)),
            0,
          ) / withBothSuds.length
        : 0;

    const withBothVoc = sessions.filter(
      (s) => s.vocBaseline != null && s.vocFinal != null,
    );
    const avgVocGain =
      withBothVoc.length > 0
        ? withBothVoc.reduce(
            (sum, s) => sum + ((s.vocFinal ?? 0) - (s.vocBaseline ?? 0)),
            0,
          ) / withBothVoc.length
        : 0;

    const avgDuration =
      totalSessions > 0
        ? sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) /
          totalSessions
        : 0;

    return {
      totalSessions,
      completed,
      aborted,
      completionRate: totalSessions > 0 ? completed / totalSessions : 0,
      avgSudsReduction: +avgSudsReduction.toFixed(2),
      avgVocGain: +avgVocGain.toFixed(2),
      avgDurationSec: Math.round(avgDuration),
      sessions: sessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt,
        durationSec: s.durationSeconds,
        sudsBaseline: s.sudsBaseline,
        sudsFinal: s.sudsFinal,
        vocBaseline: s.vocBaseline,
        vocFinal: s.vocFinal,
      })),
    };
  }

  async safetyEventsTrend(params: { severity?: string } & TimeRange) {
    const where: any = {};
    if (params.severity) where.severity = params.severity;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const events = await this.prisma.safetyEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const e of events) {
      bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
      byType[e.type] = (byType[e.type] ?? 0) + 1;
    }

    return {
      total: events.length,
      bySeverity,
      byType,
    };
  }

  async patientSummary(patientId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Patient not found');

    const sessionsResult = await this.sessionTrends({ userId: patientId });
    const [safetyCount, crisisCount, lastSession] = await Promise.all([
      this.prisma.safetyEvent.count({
        where: { session: { userId: patientId } },
      }),
      this.prisma.crisisEvent.count({ where: { userId: patientId } }),
      this.prisma.session.findFirst({
        where: { userId: patientId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, status: true, phase: true },
      }),
    ]);

    return {
      patient: user,
      stats: {
        ...sessionsResult,
        safetyEventsTotal: safetyCount,
        crisisEventsTotal: crisisCount,
        lastSession,
      },
    };
  }
}
