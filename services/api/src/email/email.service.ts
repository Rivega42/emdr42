import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  private get from(): string {
    return process.env.SMTP_FROM || 'noreply@emdr42.com';
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset for your EMDR42 account.</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px;">Reset Password</a></p>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'EMDR42 — Password Reset',
        html,
      });
    } else {
      console.log(`[EMAIL-DEV] Password reset for ${email}: ${resetUrl}`);
    }
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to EMDR42, ${name}!</h2>
        <p>Your account has been created. You can now start your EMDR therapy sessions.</p>
        <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px;">Get Started</a></p>
      </div>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Welcome to EMDR42',
        html,
      });
    } else {
      console.log(`[EMAIL-DEV] Welcome email for ${name} (${email})`);
    }
  }

  async sendSessionReminder(email: string, name: string, scheduledAt: Date): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'EMDR42 — Session Reminder',
        html: `<p>Hi ${name}, your session is scheduled for ${scheduledAt.toISOString()}.</p>`,
      });
    } else {
      console.log(`[EMAIL-DEV] Session reminder for ${name} (${email}) at ${scheduledAt.toISOString()}`);
    }
  }

  async sendWeeklyReport(email: string, name: string, stats: any): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'EMDR42 — Weekly Progress Report',
        html: `<p>Hi ${name}, here's your weekly report: ${JSON.stringify(stats)}</p>`,
      });
    } else {
      console.log(`[EMAIL-DEV] Weekly report for ${name} (${email}):`, stats);
    }
  }
}
