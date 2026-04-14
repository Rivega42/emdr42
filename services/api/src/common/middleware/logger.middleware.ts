import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const { method, originalUrl } = req;

    // Attach requestId for downstream usage
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      const logEntry = {
        requestId,
        method,
        path: originalUrl,
        statusCode,
        durationMs: duration,
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      };

      if (statusCode >= 500) {
        this.logger.error(JSON.stringify(logEntry));
      } else if (statusCode >= 400) {
        this.logger.warn(JSON.stringify(logEntry));
      } else {
        this.logger.log(JSON.stringify(logEntry));
      }
    });

    next();
  }
}
