import type { Request } from 'express';

export interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export const extractRequestMeta = (req: Request): AuditMeta => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  correlationId: (req as Request & { correlationId?: string }).correlationId,
});
