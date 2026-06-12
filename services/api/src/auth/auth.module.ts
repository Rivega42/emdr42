import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenService } from './refresh-token.service';
import { TokenRevocationService } from './token-revocation.service';
import { AuditModule } from '../audit/audit.module';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change-me-in-production' || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET is missing or too weak (need >=32 chars). Refusing to start in production.',
      );
    }
    // eslint-disable-next-line no-console
    console.warn('[security] JwtModule: JWT_SECRET weak — dev fallback');
    return secret || 'dev-only-insecure-32chars-padding-padding';
  }
  return secret;
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenService, TokenRevocationService],
  // JwtModule экспортируется для модулей, инжектящих JwtService напрямую
  // (MfaService) — без этого Nest падает на старте: "can't resolve
  // dependencies of the MfaService". Юнит-тесты это не ловят (моки).
  exports: [AuthService, RefreshTokenService, TokenRevocationService, JwtModule],
})
export class AuthModule {}
