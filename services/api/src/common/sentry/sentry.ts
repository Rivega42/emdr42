/**
 * Sentry setup (#87).
 *
 * Ленивая инициализация — если SENTRY_DSN не установлен, Sentry noop.
 * Инструкции для Вики — в issue #87.
 */

let sentryInstance: unknown = null;

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.warn('[sentry] SENTRY_DSN не установлен — Sentry отключён');
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? process.env.GIT_SHA,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0.0),
      // Не отправлять PHI — фильтр перед sent
      beforeSend: (event: {
        request?: { data?: unknown; headers?: Record<string, string> };
      }) => {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        if (event.request?.data && typeof event.request.data === 'object') {
          const data = event.request.data as Record<string, unknown>;
          for (const key of [
            'password',
            'newPassword',
            'passwordConfirm',
            'token',
            'refreshToken',
          ]) {
            if (key in data) data[key] = '[REDACTED]';
          }
        }
        return event;
      },
    });
    sentryInstance = Sentry;
    // eslint-disable-next-line no-console
    console.log(`[sentry] Initialized (env=${process.env.NODE_ENV})`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[sentry] Failed to initialize', err);
  }
};

export const captureException = (err: unknown, context?: Record<string, unknown>) => {
  if (!sentryInstance) return;
  const Sentry = sentryInstance as {
    captureException: (err: unknown, ctx?: { extra?: Record<string, unknown> }) => void;
  };
  Sentry.captureException(err, context ? { extra: context } : undefined);
};

export const captureMessage = (msg: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (!sentryInstance) return;
  const Sentry = sentryInstance as {
    captureMessage: (msg: string, level: string) => void;
  };
  Sentry.captureMessage(msg, level);
};
