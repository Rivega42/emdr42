import { Injectable, Logger } from '@nestjs/common';
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
 * Web Push реализация: заглушка. Vika инструкции в issue #148.
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
    const forceSend = (['therapist_crisis_alert', 'password_changed'] as NotificationType[])
      .includes(payload.type);

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

  private getPrefs(user: {
    settings?: unknown;
  }): { email: boolean; push: boolean; sms: boolean } {
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

  /**
   * Web Push stub. Требует VAPID keys + подписки клиента.
   * См. issue #148 для инструкций Вики + клиентский код.
   */
  private async sendPush(
    user: { id: string },
    payload: NotificationPayload,
  ): Promise<void> {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      this.logger.debug(`[Push DEV] ${payload.type} for ${user.id}`);
      return;
    }

    // Реальная реализация: web-push library + fetch subscriptions из БД
    // const subs = await this.prisma.pushSubscription.findMany({ where: { userId: user.id } })
    // for (const s of subs) await webpush.sendNotification(s, JSON.stringify({ ... }))
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
