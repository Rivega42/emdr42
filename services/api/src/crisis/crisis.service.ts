import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getHotlinesForCountry, type CountryHotlines } from '@emdr42/core';

export type CrisisSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type CrisisType =
  | 'SUICIDE_IDEATION'
  | 'SELF_HARM'
  | 'DISSOCIATION'
  | 'PANIC'
  | 'OTHER';

export interface RecordCrisisInput {
  userId: string;
  sessionId?: string;
  severity: CrisisSeverity;
  type: CrisisType;
  triggerText?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * CrisisService (#147).
 *
 * Ключевые сценарии:
 *   - Пользователь/система фиксирует crisis event (SUDS ≥9, suicide keywords, dissociation, ...)
 *   - Сервис определяет страну пользователя и возвращает hotlines
 *   - Запись CrisisEvent + AuditLog
 *   - При severity ≥ HIGH — уведомить назначенных терапевтов (hook)
 */
@Injectable()
export class CrisisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async getHotlinesForUser(userId: string): Promise<CountryHotlines> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    });
    return getHotlinesForCountry(user?.country);
  }

  async record(input: RecordCrisisInput) {
    const hotlines = await this.getHotlinesForUser(input.userId);
    const primary = hotlines.hotlines[0];

    const event = await this.prisma.crisisEvent.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId,
        severity: input.severity,
        type: input.type,
        triggerText: input.triggerText,
        actionTaken: `Shown hotline: ${primary?.name ?? 'fallback'}`,
        hotlineShown: primary?.name ?? 'fallback',
        therapistNotified: false,
        acknowledged: false,
      },
    });

    await this.audit.log({
      userId: input.userId,
      action: 'CRISIS_EVENT',
      resourceType: 'CrisisEvent',
      resourceId: event.id,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: {
        severity: input.severity,
        type: input.type,
      },
    });

    // Notify therapists at severity >= HIGH (#148) — все параллельно
    if (input.severity === 'HIGH' || input.severity === 'CRITICAL') {
      const [assignments, patient] = await Promise.all([
        this.prisma.therapistPatient.findMany({
          where: { patientId: input.userId, status: 'ACTIVE' },
          include: { therapist: { select: { id: true } } },
        }),
        this.prisma.user.findUnique({
          where: { id: input.userId },
          select: { name: true },
        }),
      ]);

      if (assignments.length > 0) {
        const patientName = patient?.name ?? 'Пациент';
        const results = await Promise.allSettled(
          assignments.map((a) =>
            this.notifications.notify({
              type: 'therapist_crisis_alert',
              userId: a.therapist.id,
              data: { patientName, severity: input.severity },
            }),
          ),
        );
        // Помечаем notified ТОЛЬКО при подтверждённой доставке хотя бы
        // одного уведомления. Иначе при тотальном падении SMTP/SMS пациент
        // оставался один с CRITICAL-событием без человеческого надзора.
        const delivered = results.some((r) => r.status === 'fulfilled');
        if (delivered) {
          await this.prisma.crisisEvent.update({
            where: { id: event.id },
            data: { therapistNotified: true },
          });
        } else {
          // Все попытки упали — оставляем therapistNotified=false и пишем
          // дополнительный audit-log для observability/alerting.
          const errors = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r) => String(r.reason));
          await this.audit.log({
            userId: input.userId,
            action: 'CRISIS_NOTIFY_FAILED',
            resourceType: 'CrisisEvent',
            resourceId: event.id,
            correlationId: input.correlationId,
            details: { severity: input.severity, errors: errors.slice(0, 3) },
          });
        }
      }
    }

    return { event, hotlines };
  }

  async acknowledge(eventId: string, userId: string) {
    return this.prisma.crisisEvent.updateMany({
      where: { id: eventId, userId },
      data: { acknowledged: true },
    });
  }

  async listForUser(userId: string, limit = 50) {
    return this.prisma.crisisEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  /**
   * Простая детекция crisis-сигналов в тексте (подстраивается под русский и
   * английский). Это baseline — real-time детекция с ML — в #128.
   */
  detectCrisisKeywords(text: string): { type: CrisisType; severity: CrisisSeverity } | null {
    const lower = text.toLowerCase();
    const suicide = [
      'убить себя', 'покончить', 'самоубийст', 'не хочу жить', 'хочу умереть',
      'kill myself', 'suicide', 'end my life', 'want to die', 'kms',
    ];
    const selfHarm = [
      'порезать', 'резать себя', 'само-вред',
      'cut myself', 'self harm', 'self-harm', 'hurt myself',
    ];
    const panic = [
      'не могу дышать', 'паническая атака',
      'panic attack', "can't breathe",
    ];

    if (suicide.some((k) => lower.includes(k))) {
      return { type: 'SUICIDE_IDEATION', severity: 'CRITICAL' };
    }
    if (selfHarm.some((k) => lower.includes(k))) {
      return { type: 'SELF_HARM', severity: 'HIGH' };
    }
    if (panic.some((k) => lower.includes(k))) {
      return { type: 'PANIC', severity: 'MODERATE' };
    }
    return null;
  }
}
