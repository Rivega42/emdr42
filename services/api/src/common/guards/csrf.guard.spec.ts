import { ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

const makeContext = (req: {
  method: string;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string>;
}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, ...req }),
    }),
  }) as any;

describe('CsrfGuard (#115)', () => {
  const guard = new CsrfGuard();

  it('пропускает safe-методы без проверки', () => {
    expect(guard.canActivate(makeContext({ method: 'GET' }))).toBe(true);
  });

  it('пропускает Bearer-auth (не CSRF-уязвим)', () => {
    expect(
      guard.canActivate(
        makeContext({
          method: 'POST',
          headers: { authorization: 'Bearer abc' },
          cookies: { access_token: 'tok' },
        }),
      ),
    ).toBe(true);
  });

  it('пропускает запросы без cookie-сессии', () => {
    expect(guard.canActivate(makeContext({ method: 'POST' }))).toBe(true);
  });

  it('cookie-auth + совпадающий X-CSRF-Token — пропуск', () => {
    expect(
      guard.canActivate(
        makeContext({
          method: 'POST',
          headers: { 'x-csrf-token': 'csrf123' },
          cookies: { access_token: 'tok', csrf_token: 'csrf123' },
        }),
      ),
    ).toBe(true);
  });

  it('cookie-auth БЕЗ заголовка — 403 (классический CSRF)', () => {
    expect(() =>
      guard.canActivate(
        makeContext({
          method: 'POST',
          cookies: { access_token: 'tok', csrf_token: 'csrf123' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('cookie-auth с НЕсовпадающим заголовком — 403', () => {
    expect(() =>
      guard.canActivate(
        makeContext({
          method: 'DELETE',
          headers: { 'x-csrf-token': 'wrong' },
          cookies: { access_token: 'tok', csrf_token: 'csrf123' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
