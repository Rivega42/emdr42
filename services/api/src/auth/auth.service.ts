import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// In-memory хранилище (в продакшене — Prisma + Redis)
const resetTokens = new Map<string, { email: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  constructor(private readonly emailService: EmailService) {}

  async register(dto: RegisterDto) {
    // TODO: Сохранение в БД через PrismaService
    console.log(`[AUTH] Регистрация пользователя ${dto.email}`);
    return {
      id: randomBytes(16).toString('hex'),
      email: dto.email,
      name: dto.name,
      role: dto.role || 'PATIENT',
    };
  }

  async login(dto: LoginDto) {
    // TODO: Проверка пароля через PrismaService + bcrypt
    console.log(`[AUTH] Вход пользователя ${dto.email}`);
    // Stub — в продакшене здесь будет реальная аутентификация
    throw new UnauthorizedException('Аутентификация через БД ещё не реализована');
  }

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
