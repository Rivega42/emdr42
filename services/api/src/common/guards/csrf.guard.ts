import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * CSRF double-submit guard (#115).
 *
 * Применяется глобально. Логика:
 *  - Безопасные методы (GET/HEAD/OPTIONS) — пропуск.
 *  - Auth через Bearer-заголовок — пропуск: заголовок не отправляется
 *    браузером автоматически, CSRF-вектора нет.
 *  - Auth через access_token cookie (или вообще без auth) при наличии
 *    cookie-сессии — требуется X-CSRF-Token === csrf_token cookie.
 *
 * Не-HttpOnly csrf_token читается фронтом; атакующий сайт не может прочитать
 * cookie чужого origin → не может подделать заголовок.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(req.method)) return true;

    // Bearer-путь — не CSRF-уязвим.
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return true;

    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    // Нет cookie-сессии — нечего защищать (public endpoints со своей защитой).
    if (!cookies?.['access_token']) return true;

    const csrfCookie = cookies['csrf_token'];
    const csrfHeader = req.headers['x-csrf-token'];
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('CSRF token mismatch');
    }
    return true;
  }
}
