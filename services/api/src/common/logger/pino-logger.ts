import { LoggerService, LogLevel } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pino = require('pino');

/**
 * PinoLoggerService (#88).
 *
 * JSON-структурированные логи для production + читаемый pretty-print для dev.
 *
 * Каждый log-entry:
 *   - level (trace/debug/info/warn/error/fatal)
 *   - time (ISO-8601)
 *   - correlationId (из req.correlationId, если доступен)
 *   - context (NestJS component name)
 *   - msg
 *   - plus structured fields
 *
 * AsyncLocalStorage для correlation propagation интегрируется отдельно через
 * CorrelationIdMiddleware — он уже проставляет req.correlationId (#124).
 */

const isDev = process.env.NODE_ENV !== 'production';

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: {
    service: 'api',
    env: process.env.NODE_ENV ?? 'development',
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.passwordConfirm',
      'req.body.newPassword',
      'req.body.token',
      'req.body.refreshToken',
      '*.passwordHash',
      '*.tokenHash',
      '*.apiKey',
      '*.stripeSecretKey',
    ],
    censor: '[REDACTED]',
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

type PinoLogger = {
  trace: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
  fatal: (obj: unknown, msg?: string) => void;
  child: (bindings: Record<string, unknown>) => PinoLogger;
};

export class PinoLoggerService implements LoggerService {
  private readonly logger: PinoLogger;

  constructor(context?: string) {
    this.logger = context ? baseLogger.child({ context }) : baseLogger;
  }

  log(message: unknown, context?: string) {
    this.logger.info({ context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ context, trace }, String(message));
  }
  warn(message: unknown, context?: string) {
    this.logger.warn({ context }, String(message));
  }
  debug(message: unknown, context?: string) {
    this.logger.debug({ context }, String(message));
  }
  verbose(message: unknown, context?: string) {
    this.logger.trace({ context }, String(message));
  }
  fatal(message: unknown, context?: string) {
    this.logger.fatal({ context }, String(message));
  }
  setLogLevels?(_levels: LogLevel[]): void {
    // pino-level устанавливается через env LOG_LEVEL
  }
}

export const rootLogger = baseLogger;
