import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    console.log(`[EMAIL] Password reset for ${email}: ${resetUrl}`);
    // TODO: Integrate with SMTP/SendGrid in production
  }

  async sendSessionReminder(email: string, name: string, scheduledAt: Date): Promise<void> {
    console.log(`[EMAIL] Session reminder for ${name} (${email}) at ${scheduledAt.toISOString()}`);
  }

  async sendWeeklyReport(email: string, name: string, stats: any): Promise<void> {
    console.log(`[EMAIL] Weekly report for ${name} (${email}):`, stats);
  }
}
