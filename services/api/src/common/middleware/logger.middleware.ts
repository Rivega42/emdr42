import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;
    const cid = (req as Request & { correlationId?: string }).correlationId;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const cidSuffix = cid ? ` [cid=${cid}]` : '';
      this.logger.log(`${method} ${originalUrl} ${statusCode} ${duration}ms${cidSuffix}`);
    });

    next();
  }
}
