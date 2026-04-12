import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

// Тип для доступа к модели AuditLog до prisma generate
// После запуска `prisma generate` можно заменить на this.prisma.auditLog
type AuditLogDelegate = {
  create: (args: { data: any }) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private get auditLog(): AuditLogDelegate {
    return (this.prisma as any).auditLog;
  }

  /** Записать событие в журнал аудита */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          details: entry.details ?? undefined,
        },
      });
    } catch (error) {
      // Ошибка аудита не должна блокировать основной запрос
      console.error('[AUDIT] Ошибка записи в журнал:', error);
    }
  }

  /** Получить журнал аудита с пагинацией */
  async findAll(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
  }) {
    const { page = 1, limit = 50, userId, action, resourceType } = params;
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const [items, total] = await Promise.all([
      this.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
