import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  role: string;
}

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change-me-in-production' || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET is missing or too weak (need >=32 chars, not the placeholder). Refusing to start.',
      );
    }
    // dev/test — пишем громкое предупреждение, но даём подняться
    // eslint-disable-next-line no-console
    console.warn('[security] JWT_SECRET is weak — using insecure dev fallback');
    return secret || 'dev-only-insecure-32chars-padding-padding';
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      // #115: Bearer (приоритет, legacy-фронт) ?? HttpOnly cookie.
      // Cookie-путь защищён CSRF-гардом (csrf.guard.ts) на мутирующих методах.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: { cookies?: Record<string, string> }) => req?.cookies?.['access_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    // userId — алиас для id. 10 контроллеров читают user.userId
    // (auth/mfa/billing/crisis/usage/verification/therapist-patient/patient-context/
    // analytics/gamification). Обратный alias оставлен для совместимости.
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
