import { Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { EmailService } from '../email/email.service';

// In-memory token store (production would use Redis)
const resetTokens = new Map<string, { email: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  constructor(private readonly emailService: EmailService) {}

  async forgotPassword(email: string): Promise<void> {
    // Generate a secure reset token
    const token = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(token).digest('hex');

    resetTokens.set(hashedToken, {
      email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await this.emailService.sendPasswordReset(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const stored = resetTokens.get(hashedToken);

    if (!stored) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (stored.expiresAt < new Date()) {
      resetTokens.delete(hashedToken);
      throw new BadRequestException('Reset token has expired');
    }

    // TODO: Hash newPassword and update user record in DB
    console.log(`[AUTH] Password reset for ${stored.email} — new password accepted`);

    resetTokens.delete(hashedToken);
  }
}
