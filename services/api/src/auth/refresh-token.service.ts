import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RefreshTokenService (#114).
 *
 * Схема ротации:
 *   - Сервер выдаёт refresh token (64 bytes base64url), хранит только SHA-256 хэш
 *   - При POST /auth/refresh:
 *     1. Проверяем что token не revoked и не expired
 *     2. Revokeем его (revokedAt = now)
 *     3. Выдаём новую пару access + refresh
 *   - Если приходит уже revoked токен → считаем token theft:
 *     revoke ВСЕ активные refresh tokens пользователя
 *
 * Это предотвращает atypical sliding window attack.
 */

export interface IssuedRefreshToken {
  token: string; // plaintext — выдать клиенту, хранить ни в коем случае
  id: string;
  expiresAt: Date;
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issue(
    userId: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString('base64url');
    const tokenHash = this.hash(token);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    const record = await (this.prisma as any).refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return { token, id: record.id, expiresAt };
  }

  async rotate(
    presentedToken: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ userId: string; newToken: IssuedRefreshToken }> {
    const tokenHash = this.hash(presentedToken);
    const record = await (this.prisma as any).refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const now = new Date();

    if (record.expiresAt < now) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (record.revokedAt) {
      // Token theft detection: токен уже revoked, но его предъявляют снова.
      // Отзываем все активные токены этого пользователя.
      await (this.prisma as any).refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException(
        'Refresh token was already used. All sessions revoked for security.',
      );
    }

    // Ротация: revoke старый, выдать новый
    await (this.prisma as any).refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: now },
    });

    const newToken = await this.issue(record.userId, meta);
    return { userId: record.userId, newToken };
  }

  async revoke(presentedToken: string): Promise<void> {
    const tokenHash = this.hash(presentedToken);
    await (this.prisma as any).refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await (this.prisma as any).refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Cleanup job — удаляет expired tokens (вызывается из cron). */
  async cleanup(): Promise<number> {
    const result = await (this.prisma as any).refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
