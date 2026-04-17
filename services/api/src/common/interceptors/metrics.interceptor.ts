import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * HTTP metrics interceptor (#82).
 * Автоматически записывает http_requests_total + http_request_duration_seconds.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Skip для не-HTTP контекстов (e.g., WS)
    if (context.getType<'http' | 'rpc' | 'ws'>() !== 'http') {
      return next.handle();
    }

    const start = process.hrtime.bigint();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res, start),
        error: () => this.record(req, res, start),
      }),
    );
  }

  private record(req: Request, res: Response, start: bigint) {
    const method = req.method;
    // Route pattern (/users/:id), не конкретный URL
    const route =
      (req as Request & { route?: { path?: string } }).route?.path ??
      req.originalUrl?.split('?')[0] ??
      'unknown';
    const status = String(res.statusCode);

    this.metrics.httpRequests.inc({ method, route, status });

    const elapsedSec = Number(process.hrtime.bigint() - start) / 1e9;
    this.metrics.httpDuration.observe({ method, route, status }, elapsedSec);
  }
}
