import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RefreshTokenService } from '../auth/refresh-token.service';

/**
 * MFA (TOTP + backup codes) service (#114).
 *
 * TOTP совместимо с RFC 6238 и Google Authenticator / Authy / 1Password:
 *   - 30-секундные окна
 *   - 6-digit codes
 *   - HMAC-SHA1 (стандарт)
 *   - ±1 window tolerance (для clock drift)
 *
 * Для production обычно используется speakeasy — но наша реализация без
 * внешних deps, более audit-friendly.
 */

const TOTP_STEP_SEC = 30;
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'sha1';

const BACKUP_CODES_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function randomBase32(bytes: number): string {
  const buf = randomBytes(bytes);
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return result;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function computeTotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac(TOTP_ALGORITHM, key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  /**
   * Setup TOTP — generates secret + provisioning URI для QR-code.
   * Пока НЕ активирует MFA — это сделает verifySetup() после того как
   * пользователь подтвердит код из authenticator app.
   */
  async setupTotp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if ((user as any).mfaEnabled) {
      throw new BadRequestException('MFA уже включён. Сначала отключите.');
    }

    const secret = randomBase32(20); // 160 bits
    // Сохраняем secret но пока mfaEnabled=false
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret } as any,
    });

    const issuer = encodeURIComponent('EMDR-AI');
    const label = encodeURIComponent(`${issuer}:${user.email}`);
    const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SEC}`;

    return { secret, otpauthUri: uri };
  }

  async verifySetup(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const secret = (user as any)?.mfaSecret as string | undefined;
    if (!user || !secret) {
      throw new BadRequestException('Сначала вызовите setup');
    }

    if (!this.verifyCode(secret, code)) {
      throw new BadRequestException('Неверный код');
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: BACKUP_CODES_COUNT }, () =>
      randomBytes(BACKUP_CODE_LENGTH).toString('hex').slice(0, BACKUP_CODE_LENGTH).toUpperCase(),
    );

    // Hash backup codes и сохраняем в VerificationToken с purpose=BACKUP_CODE
    await (this.prisma as any).verificationToken.deleteMany({
      where: { userId, purpose: 'BACKUP_CODE' },
    });
    for (const code of backupCodes) {
      const hash = await bcrypt.hash(code, 10);
      await (this.prisma as any).verificationToken.create({
        data: {
          userId,
          tokenHash: hash,
          purpose: 'BACKUP_CODE',
          expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 лет
        },
      });
    }

    // Activate MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true } as any,
    });

    await this.audit.log({
      userId,
      actorId: userId,
      action: 'MFA_ENABLED',
      resourceType: 'User',
      resourceId: userId,
      success: true,
    });

    return { enabled: true, backupCodes };
  }

  /**
   * Login flow step 2: пользователь предоставляет TOTP код.
   * Если success — возвращает access+refresh token пару.
   */
  async verifyChallenge(
    userId: string,
    code: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const secret = (user as any)?.mfaSecret as string | undefined;
    if (!user || !secret || !(user as any).mfaEnabled) {
      throw new UnauthorizedException('MFA не настроен');
    }

    let verified = this.verifyCode(secret, code);

    // Fallback: backup code
    if (!verified) {
      const backupTokens = await (this.prisma as any).verificationToken.findMany({
        where: { userId, purpose: 'BACKUP_CODE', usedAt: null },
      });
      for (const t of backupTokens) {
        if (await bcrypt.compare(code, t.tokenHash)) {
          verified = true;
          await (this.prisma as any).verificationToken.update({
            where: { id: t.id },
            data: { usedAt: new Date() },
          });
          await this.audit.log({
            userId,
            actorId: userId,
            action: 'MFA_BACKUP_CODE_USED',
            resourceType: 'User',
            resourceId: userId,
            success: true,
            ipAddress: meta?.ip,
            userAgent: meta?.userAgent,
          });
          break;
        }
      }
    }

    if (!verified) {
      await this.audit.log({
        userId,
        action: 'MFA_VERIFY_FAILED',
        resourceType: 'User',
        resourceId: userId,
        success: false,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Неверный код MFA');
    }

    const accessToken = this.jwt.sign({ sub: user.id, role: user.role });
    const refresh = await this.refreshTokens.issue(user.id, meta);

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async disable(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный пароль');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null } as any,
    });
    await (this.prisma as any).verificationToken.deleteMany({
      where: { userId, purpose: 'BACKUP_CODE' },
    });

    await this.audit.log({
      userId,
      actorId: userId,
      action: 'MFA_DISABLED',
      resourceType: 'User',
      resourceId: userId,
      success: true,
    });

    return { disabled: true };
  }

  private verifyCode(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000 / TOTP_STEP_SEC);
    for (const offset of [-1, 0, 1]) {
      const computed = computeTotp(secret, now + offset);
      if (computed === code) return true;
    }
    return false;
  }
}
