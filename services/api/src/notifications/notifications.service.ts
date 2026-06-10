import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * NotificationsService (#148).
 *
 * Единая точка отправки уведомлений. Учитывает preferences пользователя
 * (stored in User.settings JSON как `notifications: { email: bool, push: bool, sms: bool }`).
 *
 * Channels:
 *   - Email — через EmailService (SMTP)
 *   - Push — Web Push API (VAPID, требует подписки клиента)
 *   - SMS — Twilio (см. #149)
 *
 * Web Push (#234): web-push library + PushSubscription модель. Требует
 * VAPID-ключи в env (npx web-push generate-vapid-keys).
 */

type NotificationType =
  | 'welcome'
  | 'session_reminder'
  | 'weekly_progress'
  | 'therapist_crisis_alert'
  | 'email_verified'
  | 'password_changed';

interface NotificationPayload {
  type: NotificationType;
  userId: string;
  data: Record<string, unknown>;
}

const DEFAULT_PREFS = {
  email: true,
  push: false,
  sms: false,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async notify(payload: NotificationPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || user.deletedAt || !user.isActive) return;

    const prefs = this.getPrefs(user);

    // Always-on notifications (regardless of prefs): crisis/security
    const forceSend = (
      ['therapist_crisis_alert', 'password_changed'] as NotificationType[]
    ).includes(payload.type);

    if (prefs.email || forceSend) {
      await this.sendEmail(user as any, payload).catch((err) =>
        this.logger.error(`Email notify failed: ${err}`),
      );
    }
    if (prefs.push) {
      await this.sendPush(user as any, payload).catch((err) =>
        this.logger.warn(`Push notify failed: ${err}`),
      );
    }
    if (prefs.sms) {
      await this.sendSms(user as any, payload).catch((err) =>
        this.logger.warn(`SMS notify failed: ${err}`),
      );
    }
  }

  private getPrefs(user: { settings?: unknown }): { email: boolean; push: boolean; sms: boolean } {
    const settings = user.settings as
      | { notifications?: Partial<typeof DEFAULT_PREFS> }
      | null
      | undefined;
    return {
      ...DEFAULT_PREFS,
      ...(settings?.notifications ?? {}),
    };
  }

  private async sendEmail(
    user: { email: string; name: string },
    payload: NotificationPayload,
  ): Promise<void> {
    switch (payload.type) {
      case 'welcome':
        return this.email.sendWelcome(user.email, user.name);
      case 'session_reminder':
        return this.email.sendSessionReminder(
          user.email,
          user.name,
          new Date((payload.data as { scheduledAt: string }).scheduledAt),
        );
      case 'weekly_progress':
        return this.email.sendWeeklyReport(
          user.email,
          user.name,
          payload.data as {
            sessionsCount: number;
            avgSudsReduction: number;
            avgVocGain: number;
          },
        );
      case 'therapist_crisis_alert':
        return this.email.sendCrisisAlertToTherapist(
          user.email,
          (payload.data as { patientName: string }).patientName,
          (payload.data as { severity: string }).severity,
        );
      default:
        return; // types that don't need email
    }
  }

  /** Заголовки/тексты push по типам — без PHI (видны на lock screen). */
  private pushContent(payload: NotificationPayload): { title: string; body: string } {
    switch (payload.type) {
      case 'session_reminder':
        return { title: 'EMDR-AI', body: 'Напоминание: запланирована сессия' };
      case 'weekly_progress':
        return { title: 'EMDR-AI', body: 'Ваш недельный отчёт о прогрессе готов' };
      case 'therapist_crisis_alert':
        return { title: 'EMDR-AI — внимание', body: 'Кризисное событие у пациента' };
      default:
        return { title: 'EMDR-AI', body: 'Новое уведомление' };
    }
  }

  /**
   * Web Push (#234). Шлёт во все подписки пользователя; 404/410 от
   * push-сервиса означает протухшую подписку — удаляем её.
   * Контент намеренно без PHI — уведомления видны на lock screen.
   */
  private async sendPush(user: { id: string }, payload: NotificationPayload): Promise<void> {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      this.logger.debug(`[Push DEV] ${payload.type} for ${user.id}`);
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = await (this.prisma as any).pushSubscription.findMany({
      where: { userId: user.id },
    });
    if (subs.length === 0) return;

    const message = JSON.stringify(this.pushContent(payload));

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Подписка протухла (браузер отозвал) — чистим.
          await (this.prisma as any).pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => void 0);
        } else {
          this.logger.warn(`Push to ${sub.endpoint.slice(0, 40)}… failed: ${err}`);
        }
      }
    }
  }

  /** Сохранить подписку браузера (upsert по endpoint). */
  async subscribe(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    return (this.prisma as any).pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent,
      },
    });
  }

  /** Удалить подписку (logout / выключение в настройках). */
  async unsubscribe(userId: string, endpoint: string) {
    await (this.prisma as any).pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { success: true };
  }

  private async sendSms(
    user: { phone?: string | null },
    payload: NotificationPayload,
  ): Promise<void> {
    if (!user.phone) return;
    // Twilio stub — реальные доставки через VerificationService.sendSms или отдельный канал
    this.logger.debug(`[SMS DEV] ${payload.type} to ${user.phone}`);
  }
}
