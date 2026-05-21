import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

/**
 * GDPR data retention defaults (#121).
 * HIPAA требует 6 лет audit. Сессии/emotion data — 2 года после последней активности
 * (конфигурируется платформой).
 */
const DEFAULT_RETENTION_DAYS = 730;
const SOFT_DELETE_GRACE_PERIOD_DAYS = 30;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          settings: true,
        },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string, _currentUserId: string, _role: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
    role: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    if (id !== currentUserId && role !== 'ADMIN') {
      throw new ForbiddenException('Cannot update another user');
    }

    const updated = await this.prisma.user.update({ where: { id }, data: dto });

    await this.audit.log({
      userId: id,
      actorId: currentUserId,
      action: 'USER_UPDATE',
      resourceType: 'User',
      resourceId: id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
      details: { fields: Object.keys(dto) },
    });

    return updated;
  }

  async deactivate(id: string, actorId?: string, meta?: AuditMeta) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      userId: id,
      actorId,
      action: 'USER_DEACTIVATE',
      resourceType: 'User',
      resourceId: id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
    });

    return updated;
  }

  async getUserSessions(
    userId: string,
    _currentUserId: string,
    _role: string,
    pagination: PaginationDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const { page = 1, limit = 20 } = pagination;
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId, deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.session.count({ where: { userId, deletedAt: null } }),
    ]);

    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  /** GDPR Art. 15 — data export (#121) */
  async exportAllData(userId: string, meta?: AuditMeta) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          include: {
            timelineEvents: true,
            emotionRecords: true,
            sudsRecords: true,
            vocRecords: true,
            safetyEvents: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const { passwordHash, resetToken, resetTokenExpiry, ...safeUser } =
      user as any;

    await this.audit.log({
      userId,
      actorId: userId,
      action: 'DATA_EXPORT',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
    });

    return {
      format: 'JSON',
      gdprBasis: 'Article 15 — Right of access',
      exportedAt: new Date().toISOString(),
      user: safeUser,
    };
  }

  /**
   * GDPR Art. 17 — Right to erasure / soft delete (#121).
   *
   * Маркирует User.deletedAt + Session.deletedAt, планирует hard delete через
   * grace period. Актуальный hard-delete делает retention job.
   */
  async requestDeletion(userId: string, meta?: AuditMeta): Promise<{
    status: 'scheduled';
    hardDeleteAt: string;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const now = new Date();
    const hardDeleteAt = new Date(
      now.getTime() + SOFT_DELETE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: now, isActive: false },
      }),
      this.prisma.session.updateMany({
        where: { userId },
        data: { deletedAt: now, dataExpiresAt: hardDeleteAt },
      }),
    ]);

    await this.audit.log({
      userId,
      actorId: userId,
      action: 'DATA_DELETION_REQUEST',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
      details: { hardDeleteAt: hardDeleteAt.toISOString() },
    });

    return { status: 'scheduled', hardDeleteAt: hardDeleteAt.toISOString() };
  }

  /** Восстановление soft-deleted user в grace period */
  async cancelDeletion(userId: string, actorId?: string, meta?: AuditMeta) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.deletedAt) {
      throw new NotFoundException('No pending deletion for this user');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: null, isActive: true },
      }),
      this.prisma.session.updateMany({
        where: { userId, deletedAt: { not: null } },
        data: { deletedAt: null, dataExpiresAt: null },
      }),
    ]);

    await this.audit.log({
      userId,
      actorId,
      action: 'DATA_DELETION_CANCEL',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
    });

    return { status: 'cancelled' };
  }

  /**
   * Hard delete — полное удаление всех данных пользователя.
   * Вызывается только из retention job (не через API).
   */
  async hardDeleteAllData(userId: string): Promise<{ deleted: number }> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    let deleted = 0;

    await this.prisma.$transaction(async (tx) => {
      if (sessionIds.length > 0) {
        await tx.safetyEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.emotionRecord.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.sudsRecord.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.vocRecord.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.timelineEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.session.deleteMany({ where: { userId } });
        deleted += sessionIds.length;
      }
      await (tx as any).therapistNote.deleteMany({ where: { patientId: userId } });
      await (tx as any).therapistPatient.deleteMany({
        where: { OR: [{ patientId: userId }, { therapistId: userId }] },
      });
      await (tx as any).crisisEvent.deleteMany({ where: { userId } });
      await (tx as any).refreshToken.deleteMany({ where: { userId } });
      await (tx as any).verificationToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    this.logger.log(`Hard-deleted user ${userId} (sessions: ${sessionIds.length})`);
    return { deleted };
  }

  /**
   * Retention job — вызывать из cron worker.
   * Hard-deletes users past grace period, expires sessions past dataExpiresAt.
   */
  async runRetentionJob(): Promise<{
    usersHardDeleted: number;
    sessionsSoftDeleted: number;
  }> {
    const now = new Date();

    // 1. Users с deletedAt > grace period → hard delete
    const graceCutoff = new Date(
      now.getTime() - SOFT_DELETE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    const usersToDelete = await this.prisma.user.findMany({
      where: { deletedAt: { lt: graceCutoff } },
      select: { id: true },
    });
    let usersHardDeleted = 0;
    for (const u of usersToDelete) {
      try {
        await this.hardDeleteAllData(u.id);
        usersHardDeleted++;
      } catch (err) {
        this.logger.error(`Failed to hard-delete user ${u.id}: ${err}`);
      }
    }

    // 2. Sessions с dataExpiresAt < now → soft delete если ещё не soft-deleted
    const retentionCutoff = new Date(
      now.getTime() - DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const expired = await this.prisma.session.updateMany({
      where: {
        OR: [
          { dataExpiresAt: { lt: now } },
          { createdAt: { lt: retentionCutoff }, deletedAt: null },
        ],
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    return { usersHardDeleted, sessionsSoftDeleted: expired.count };
  }

  /** Deprecated: используется только в legacy code, заменено на requestDeletion */
  async deleteAllData(userId: string): Promise<void> {
    await this.hardDeleteAllData(userId);
  }
}
