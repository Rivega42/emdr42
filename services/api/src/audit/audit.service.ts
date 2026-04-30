import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  actorId?: string;
  correlationId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  success?: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

type AuditLogDelegate = {
  create: (args: { data: any }) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
};

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private get auditLog(): AuditLogDelegate {
    return this.prisma.auditLog;
  }

  /** Записать событие в журнал аудита */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.auditLog.create({
        data: {
          userId: entry.userId,
          actorId: entry.actorId,
          correlationId: entry.correlationId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          success: entry.success ?? true,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          details: entry.details ?? undefined,
        },
      });
    } catch (error) {
      // Audit errors must not block main request (#120).
      // eslint-disable-next-line no-console
      console.error('[AUDIT] log failed:', error);
    }
  }

  /**
   * Поиск по журналу с жёсткой пагинацией (#120).
   * Максимум 100 записей за запрос (защита от DoS).
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    userId?: string;
    actorId?: string;
    action?: string;
    resourceType?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(
      Math.max(params.limit ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.actorId) where.actorId = params.actorId;
    if (params.action) where.action = params.action;
    if (params.resourceType) where.resourceType = params.resourceType;
    if (params.from || params.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    const [items, total] = await Promise.all([
      this.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
