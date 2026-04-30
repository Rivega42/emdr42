import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * EmailService (#148, #149).
 *
 * Развилка:
 *   - Если SMTP_HOST задан — используется nodemailer SMTP (production)
 *   - Иначе fallback в console.log (dev/test)
 *
 * Шаблоны: inline HTML с базовыми стилями. При росте — вынести в .hbs/MJML.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any = null;
  private readonly fromAddress =
    process.env.SMTP_FROM || 'EMDR-AI <no-reply@emdr42.local>';

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      });
    } else {
      this.logger.warn(
        '[EmailService] SMTP_HOST not configured — emails will be logged, not sent',
      );
    }
  }

  async send(payload: MailPayload): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[EMAIL DEV] to=${payload.to} subject="${payload.subject}"`,
      );
      this.logger.debug(payload.html);
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? this.stripHtml(payload.html),
    });
  }

  // ---------- Domain emails ----------

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.appUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;
    await this.send({
      to: email,
      subject: 'EMDR-AI — сброс пароля',
      html: this.layout({
        title: 'Сброс пароля',
        body: `
          <p>Вы запросили сброс пароля для вашего аккаунта EMDR-AI.</p>
          <p>Ссылка действительна 1 час:</p>
          ${this.ctaButton('Сбросить пароль', resetUrl)}
          <p class="muted">Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
        `,
      }),
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const url = `${this.appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'EMDR-AI — подтверждение email',
      html: this.layout({
        title: 'Подтвердите ваш email',
        body: `
          <p>Спасибо за регистрацию в EMDR-AI Therapy Assistant!</p>
          <p>Подтвердите ваш email, чтобы получить полный доступ к функциям:</p>
          ${this.ctaButton('Подтвердить email', url)}
          <p class="muted">Ссылка действительна 48 часов.</p>
        `,
      }),
    });
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Добро пожаловать в EMDR-AI',
      html: this.layout({
        title: `Здравствуйте, ${name}!`,
        body: `
          <p>Рады приветствовать вас в EMDR-AI Therapy Assistant.</p>
          <p>Наша платформа использует проверенные клинические протоколы EMDR (Eye Movement Desensitization and Reprocessing) вместе с ИИ-ассистентом для сопровождения ваших терапевтических сессий.</p>
          <p><strong>Важно:</strong> EMDR-AI не заменяет работу с лицензированным терапевтом. Если вы переживаете кризис, обратитесь за помощью: 8-800-2000-122 (Россия), 988 (США).</p>
          ${this.ctaButton('Начать первую сессию', `${this.appUrl()}/dashboard`)}
        `,
      }),
    });
  }

  async sendSessionReminder(
    email: string,
    name: string,
    scheduledAt: Date,
  ): Promise<void> {
    const formatted = scheduledAt.toLocaleString('ru-RU', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    await this.send({
      to: email,
      subject: 'Напоминание о сессии EMDR',
      html: this.layout({
        title: 'Напоминание о сессии',
        body: `
          <p>${name}, ваша сессия запланирована на <strong>${formatted}</strong>.</p>
          ${this.ctaButton('Перейти к сессии', `${this.appUrl()}/session`)}
          <p class="muted">Если нужно перенести — зайдите в Dashboard.</p>
        `,
      }),
    });
  }

  async sendCrisisAlertToTherapist(
    therapistEmail: string,
    patientName: string,
    severity: string,
  ): Promise<void> {
    await this.send({
      to: therapistEmail,
      subject: `[URGENT] Crisis event для пациента ${patientName}`,
      html: this.layout({
        title: 'Crisis Alert',
        body: `
          <p>Severity: <strong>${severity}</strong></p>
          <p>Пациент ${patientName} зафиксировал crisis event.</p>
          ${this.ctaButton('Открыть карту пациента', `${this.appUrl()}/patients`)}
          <p class="muted">Это автоматическое уведомление от EMDR-AI.</p>
        `,
      }),
    });
  }

  async sendWeeklyReport(
    email: string,
    name: string,
    stats: {
      sessionsCount: number;
      avgSudsReduction: number;
      avgVocGain: number;
    },
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'EMDR-AI — еженедельный прогресс',
      html: this.layout({
        title: `${name}, ваш прогресс`,
        body: `
          <ul>
            <li>Сессий за неделю: <strong>${stats.sessionsCount}</strong></li>
            <li>Среднее снижение SUDS: <strong>${stats.avgSudsReduction.toFixed(1)}</strong></li>
            <li>Средний прирост VOC: <strong>${stats.avgVocGain.toFixed(1)}</strong></li>
          </ul>
          ${this.ctaButton('Посмотреть подробности', `${this.appUrl()}/progress`)}
        `,
      }),
    });
  }

  // ---------- Layout helpers ----------

  private appUrl(): string {
    return process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  private layout({ title, body }: { title: string; body: string }): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f9fafb; margin: 0; padding: 24px; color: #111827; }
  .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb; }
  h1 { font-size: 20px; margin: 0 0 16px; }
  .muted { color: #6b7280; font-size: 14px; }
  .cta { display: inline-block; padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px; margin: 12px 0; font-weight: 600; }
  .cta:hover { background: #1f2937; }
</style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${body}
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p class="muted">EMDR-AI Therapy Assistant · <a href="${this.appUrl()}" style="color:#6b7280;">${this.appUrl()}</a></p>
  </div>
</body>
</html>`;
  }

  private ctaButton(label: string, url: string): string {
    return `<p><a href="${url}" class="cta">${label}</a></p>`;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}
