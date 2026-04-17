import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const EMAIL_VERIFY_TTL_MS = 48 * 60 * 60 * 1000; // 48h
const PHONE_CODE_TTL_MS = 10 * 60 * 1000; // 10m

/**
 * VerificationService (#149).
 *
 * Отвечает за:
 *   - Отправку / проверку email verification токенов
 *   - Отправку / проверку SMS кодов (через провайдера Twilio — см. инструкции Вики в issue)
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // ---------- Email ----------

  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if ((user as any).emailVerifiedAt) return; // already verified, no-op

    // Invalidate prior unused tokens
    await (this.prisma as any).verificationToken.updateMany({
      where: { userId, purpose: 'EMAIL_VERIFY', usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hash(token);

    await (this.prisma as any).verificationToken.create({
      data: {
        userId,
        tokenHash,
        purpose: 'EMAIL_VERIFY',
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      },
    });

    await this.email.sendEmailVerification(user.email, token);
  }

  async verifyEmail(token: string): Promise<{ userId: string }> {
    const tokenHash = this.hash(token);
    const record = await (this.prisma as any).verificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.purpose !== 'EMAIL_VERIFY') {
      throw new BadRequestException('Invalid verification token');
    }
    if (record.usedAt) throw new BadRequestException('Token already used');
    if (record.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() } as any,
      }),
      (this.prisma as any).verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { userId: record.userId };
  }

  // ---------- Phone (SMS) ----------

  /**
   * SMS sender stub — реализация требует Twilio credentials.
   * См. issue #149: VIKA_INSTRUCTIONS раздел.
   */
  private async sendSms(phone: string, message: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      // eslint-disable-next-line no-console
      console.log(
        `[SMS DEV] to=${phone}: ${message} (Twilio credentials not configured)`,
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio')(accountSid, authToken);
      await twilio.messages.create({
        to: phone,
        from: fromNumber,
        body: message,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SMS] send failed', err);
      throw err;
    }
  }

  async sendPhoneCode(userId: string, phone: string): Promise<void> {
    const code = (Math.floor(Math.random() * 900000) + 100000).toString();
    const codeHash = this.hash(code);

    await (this.prisma as any).verificationToken.updateMany({
      where: { userId, purpose: 'PHONE_VERIFY', usedAt: null },
      data: { usedAt: new Date() },
    });

    await (this.prisma as any).verificationToken.create({
      data: {
        userId,
        tokenHash: codeHash,
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() + PHONE_CODE_TTL_MS),
      },
    });

    // Update user's phone number in DB (unverified yet)
    await this.prisma.user.update({
      where: { id: userId },
      data: { phone } as any,
    });

    await this.sendSms(
      phone,
      `Ваш код подтверждения EMDR-AI: ${code}. Действителен 10 минут.`,
    );
  }

  async verifyPhone(userId: string, code: string): Promise<void> {
    const codeHash = this.hash(code);
    const record = await (this.prisma as any).verificationToken.findFirst({
      where: {
        userId,
        purpose: 'PHONE_VERIFY',
        usedAt: null,
        tokenHash: codeHash,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw new BadRequestException('Invalid or expired code');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { phoneVerifiedAt: new Date() } as any,
      }),
      (this.prisma as any).verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }
}
