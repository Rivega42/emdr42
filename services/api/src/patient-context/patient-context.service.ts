import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PatientContextService (#81).
 *
 * Собирает cross-session контекст пациента для передачи в AI-оркестратор:
 *   - target memories из прошлых сессий
 *   - SUDS/VOC trajectory
 *   - safety events history
 *   - emotional baseline (avg stress, valence)
 *   - EMDR phase прогресс
 *
 * Этот context отправляется в system prompt AI при старте новой сессии,
 * чтобы AI "помнил" историю пациента между сессиями.
 *
 * PII redaction (#128) применяется перед передачей в LLM.
 */

export interface PatientContext {
  patientId: string;
  totalSessions: number;
  lastSessionAt: string | null;

  // EMDR state
  currentPhase: string | null;
  activeTargetMemory: {
    targetMemory: string | null;
    negativeCognition: string | null;
    positiveCognition: string | null;
    initialSuds: number | null;
    currentSuds: number | null;
  } | null;

  // Прогресс
  sudsTrajectory: Array<{ sessionId: string; date: string; baseline: number | null; final: number | null }>;
  vocTrajectory: Array<{ sessionId: string; date: string; baseline: number | null; final: number | null }>;

  // Safety
  hadCrisisEvents: boolean;
  recentSafetyEvents: Array<{ type: string; severity: string; date: string }>;

  // Emotional baseline
  avgStressRecent: number | null;
  avgValenceRecent: number | null;

  // Therapist notes (только SHARED_WITH_PATIENT visible, SUPERVISION private excluded)
  sharedNotes: Array<{ content: string; date: string }>;
}

@Injectable()
export class PatientContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(patientId: string): Promise<PatientContext> {
    const sessions = await this.prisma.session.findMany({
      where: { userId: patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        phase: true,
        targetMemory: true,
        negativeCognition: true,
        positiveCognition: true,
        sudsBaseline: true,
        sudsFinal: true,
        vocBaseline: true,
        vocFinal: true,
        status: true,
      },
    });

    const lastSession = sessions[0] ?? null;

    // Active target: берём из последней сессии если она не completed
    const activeTargetMemory =
      lastSession && lastSession.status !== 'COMPLETED' && lastSession.targetMemory
        ? {
            targetMemory: lastSession.targetMemory,
            negativeCognition: lastSession.negativeCognition,
            positiveCognition: lastSession.positiveCognition,
            initialSuds: lastSession.sudsBaseline,
            currentSuds: lastSession.sudsFinal ?? lastSession.sudsBaseline,
          }
        : null;

    // Trajectories
    const sudsTrajectory = sessions
      .filter((s) => s.sudsBaseline != null || s.sudsFinal != null)
      .map((s) => ({
        sessionId: s.id,
        date: s.createdAt.toISOString(),
        baseline: s.sudsBaseline,
        final: s.sudsFinal,
      }))
      .reverse();

    const vocTrajectory = sessions
      .filter((s) => s.vocBaseline != null || s.vocFinal != null)
      .map((s) => ({
        sessionId: s.id,
        date: s.createdAt.toISOString(),
        baseline: s.vocBaseline,
        final: s.vocFinal,
      }))
      .reverse();

    // Safety events
    const sessionIds = sessions.map((s) => s.id);
    const [safetyEvents, crisisCount] = await Promise.all([
      sessionIds.length > 0
        ? this.prisma.safetyEvent.findMany({
            where: { sessionId: { in: sessionIds } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { type: true, severity: true, createdAt: true },
          })
        : Promise.resolve([]),
      this.prisma.crisisEvent.count({ where: { userId: patientId } }),
    ]);

    // Emotional baseline — average последних 500 emotion records
    let avgStressRecent: number | null = null;
    let avgValenceRecent: number | null = null;
    if (sessionIds.length > 0) {
      const emotions = await this.prisma.emotionRecord.findMany({
        where: { sessionId: { in: sessionIds } },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: { stress: true, valence: true },
      });
      if (emotions.length > 0) {
        avgStressRecent =
          emotions.reduce((s, e) => s + e.stress, 0) / emotions.length;
        avgValenceRecent =
          emotions.reduce((s, e) => s + e.valence, 0) / emotions.length;
      }
    }

    // Shared notes (visible to patient)
    const sharedNotes = await this.prisma.therapistNote.findMany({
      where: { patientId, visibility: 'SHARED_WITH_PATIENT' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { content: true, createdAt: true },
    });

    return {
      patientId,
      totalSessions: sessions.length,
      lastSessionAt: lastSession?.createdAt.toISOString() ?? null,
      currentPhase: lastSession?.phase ?? null,
      activeTargetMemory,
      sudsTrajectory,
      vocTrajectory,
      hadCrisisEvents: crisisCount > 0,
      recentSafetyEvents: safetyEvents.map((e) => ({
        type: e.type,
        severity: e.severity,
        date: e.createdAt.toISOString(),
      })),
      avgStressRecent,
      avgValenceRecent,
      sharedNotes: sharedNotes.map((n: { content: string; createdAt: Date }) => ({
        content: n.content,
        date: n.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Превращает context в краткий text-summary для system prompt.
   * БЕЗ PII — имена/адреса должны быть redacted на уровне targetMemory при вводе.
   */
  formatForSystemPrompt(ctx: PatientContext): string {
    if (ctx.totalSessions === 0) {
      return 'Это первая сессия пациента. Прошлого контекста нет.';
    }

    const lines: string[] = [];
    lines.push(`Количество прошлых сессий: ${ctx.totalSessions}.`);

    if (ctx.lastSessionAt) {
      const days = Math.floor(
        (Date.now() - new Date(ctx.lastSessionAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      lines.push(`Последняя сессия: ${days} дней назад.`);
    }

    if (ctx.currentPhase) {
      lines.push(`Текущая EMDR-фаза: ${ctx.currentPhase}.`);
    }

    if (ctx.activeTargetMemory) {
      lines.push(
        `Продолжается работа с целью: "${ctx.activeTargetMemory.targetMemory ?? '(не указано)'}". ` +
          `Текущий SUDS: ${ctx.activeTargetMemory.currentSuds ?? 'n/a'} (начальный ${
            ctx.activeTargetMemory.initialSuds ?? 'n/a'
          }).`,
      );
    }

    if (ctx.sudsTrajectory.length >= 2) {
      const first = ctx.sudsTrajectory[0].baseline;
      const last = ctx.sudsTrajectory[ctx.sudsTrajectory.length - 1].final;
      if (first != null && last != null) {
        const delta = first - last;
        lines.push(
          `SUDS динамика за последние сессии: ${first} → ${last} (${delta > 0 ? 'улучшение' : 'без изменений'}).`,
        );
      }
    }

    if (ctx.hadCrisisEvents) {
      lines.push('⚠️ В истории пациента есть crisis events. Повышенная осторожность рекомендована.');
    }

    const criticalSafety = ctx.recentSafetyEvents.filter((e) => e.severity === 'critical' || e.severity === 'high');
    if (criticalSafety.length > 0) {
      lines.push(`Недавние safety events: ${criticalSafety.map((e) => e.type).join(', ')}.`);
    }

    if (ctx.avgStressRecent != null) {
      const level =
        ctx.avgStressRecent > 0.7 ? 'высокий' : ctx.avgStressRecent > 0.4 ? 'умеренный' : 'низкий';
      lines.push(`Средний уровень стресса недавно: ${level} (${ctx.avgStressRecent.toFixed(2)}).`);
    }

    if (ctx.sharedNotes.length > 0) {
      lines.push('Заметки терапевта (shared):');
      ctx.sharedNotes.slice(0, 3).forEach((n) => lines.push(`- ${n.content}`));
    }

    return lines.join('\n');
  }
}
