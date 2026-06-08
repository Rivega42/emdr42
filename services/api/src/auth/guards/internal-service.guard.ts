import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Гард для эндпоинтов, которые вызывает только Orchestrator (или другой
 * внутренний сервис), а не пользовательский браузер. Проверяет общий
 * INTERNAL_API_KEY в заголовке `x-internal-key`.
 *
 * Использование:
 *   @UseGuards(InternalServiceGuard)
 *   @Post('record')
 *
 * Без этого ключа браузер пациента мог бы вызывать `/usage/record`
 * напрямую и накручивать произвольный biling/cost.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected || expected.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'INTERNAL_API_KEY missing or too weak in production. Refusing.',
        );
      }
      // dev — пускаем без проверки, но громко предупреждаем.
      // eslint-disable-next-line no-console
      console.warn('[security] InternalServiceGuard: dev-mode bypass');
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header('x-internal-key');
    if (!provided || provided.length !== expected.length) {
      throw new UnauthorizedException('Internal endpoint');
    }
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Internal endpoint');
    }
    return true;
  }
}
