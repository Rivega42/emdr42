import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Correlation ID middleware (#124).
 *
 * Прокидывает/генерирует x-correlation-id для сквозного трейсинга запросов
 * api → orchestrator → LLM. Возвращается клиенту в response header.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_HEADER];
    const id = typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();

    (req as Request & { correlationId: string }).correlationId = id;
    res.setHeader(CORRELATION_HEADER, id);

    next();
  }
}
