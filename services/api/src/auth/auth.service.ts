import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenService } from './refresh-token.service';

const BCRYPT_COST = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export interface AuthMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  // ---------- Register ----------

  async register(dto: RegisterDto, meta?: AuthMeta) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
      },
    });

    return this.issueTokenPair(user, meta);
  }

  // ---------- Login ----------

  async login(dto: LoginDto, meta?: AuthMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always perform bcrypt compare even if user not found — constant time (прятать user enumeration)
    const dummyHash =
      '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? dummyHash,
    );

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    if (!valid) {
      await this.handleFailedAttempt(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — reset counters
    if (user.failedAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    // MFA challenge skeleton — полноценный TOTP flow требует отдельных endpoints
    if ((user as any).mfaEnabled) {
      return { mfaRequired: true, userId: user.id };
    }

    return this.issueTokenPair(user, meta);
  }

  private async handleFailedAttempt(userId: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    });

    if (updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil, failedAttempts: 0 },
      });
    }
  }

  // ---------- Refresh ----------

  async refresh(refreshToken: string, meta?: AuthMeta) {
    const { userId, newToken } = await this.refreshTokens.rotate(
      refreshToken,
      meta,
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('User no longer active');
    }

    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });
    return {
      accessToken,
      refreshToken: newToken.token,
      refreshTokenExpiresAt: newToken.expiresAt,
      user: this.publicUser(user),
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) await this.refreshTokens.revoke(refreshToken);
    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.refreshTokens.revokeAllForUser(userId);
    return { success: true };
  }

  // ---------- Password reset (#77 теперь в БД) ----------

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always behave the same (mitigate enumeration)
    if (!user || user.deletedAt) return;

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.verificationToken.updateMany({
      where: { userId: user.id, purpose: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        purpose: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    await this.emailService.sendPasswordReset(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.purpose !== 'PASSWORD_RESET') {
      throw new BadRequestException('Invalid reset token');
    }
    if (record.usedAt) {
      throw new BadRequestException('Reset token already used');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedAttempts: 0, lockedUntil: null },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Revoke все active refresh — old sessions должны выкинуть
    await this.refreshTokens.revokeAllForUser(record.userId);
  }

  // ---------- Helpers ----------

  private publicUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private async issueTokenPair(
    user: { id: string; email: string; name: string; role: string },
    meta?: AuthMeta,
  ) {
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });
    const refresh = await this.refreshTokens.issue(user.id, meta);

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: this.publicUser(user),
    };
  }
}
