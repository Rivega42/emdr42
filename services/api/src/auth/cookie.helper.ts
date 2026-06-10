import type { Response } from 'express';
import { randomBytes } from 'crypto';

/**
 * HttpOnly cookie-выдача токенов (#115, Stage A).
 *
 * Выдаются ПАРАЛЛЕЛЬНО телу ответа: legacy-фронт продолжает работать через
 * Bearer/localStorage, middleware.ts (Next) и cookie-aware клиенты получают
 * HttpOnly-путь, недоступный XSS.
 *
 * CSRF: cookie-auth уязвим к CSRF (браузер шлёт cookie автоматически) —
 * поэтому вместе с токенами ставится НЕ-HttpOnly `csrf_token`; мутирующие
 * запросы обязаны прислать его в X-CSRF-Token (double-submit, csrf.guard.ts).
 */

const isProd = () => process.env.NODE_ENV === 'production';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // = JWT_EXPIRES_IN
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // = refresh TTL

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken?: string },
): void {
  const base = {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict' as const,
    path: '/',
  };
  res.cookie('access_token', tokens.accessToken, {
    ...base,
    maxAge: ACCESS_MAX_AGE_MS,
  });
  if (tokens.refreshToken) {
    res.cookie('refresh_token', tokens.refreshToken, {
      ...base,
      // refresh нужен только на /auth/refresh и /auth/logout
      path: '/auth',
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }
  // Double-submit CSRF: НЕ HttpOnly — фронт читает и шлёт в X-CSRF-Token.
  res.cookie('csrf_token', randomBytes(24).toString('base64url'), {
    httpOnly: false,
    secure: isProd(),
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/auth' });
  res.clearCookie('csrf_token', { path: '/' });
}
