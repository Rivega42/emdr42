import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface AuditMeta {
  ip?: string;
  userAgent?: string;
  correlationId?: string;
}

const DEFAULT_EXPIRES_IN_DAYS = 14;
const MAX_INVITES_PER_HOUR = 20;

/**
 * #160 — PatientInviteService.
 *
 * Терапевт создаёт invite → выдаётся plain-token (показывается ОДИН раз!),
 * в БД хранится только sha256(token). Пациент открывает /invite/<token>
 * → preview (без авторизации) → accept (с авторизацией) → автоматическая
 * связь TherapistPatient.
 */
@Injectable()
export class PatientInviteService {
  private readonly logger = new Logger(PatientInviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(
    therapistId: string,
    input: { email?: string; expiresInDays?: number; notes?: string },
    meta?: AuditMeta,
  ) {
    // Rate-limit: 20 invites / час / терапевт.
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await (this.prisma as any).patientInvite.count({
      where: { therapistId, createdAt: { gte: since } },
    });
    if (recent >= MAX_INVITES_PER_HOUR) {
      throw new BadRequestException(
        `Превышен лимит ${MAX_INVITES_PER_HOUR} приглашений в час`,
      );
    }

    // 24 байта = 192 бит энтропии, base64url safe в URL.
    const token = randomBytes(24).toString('base64url');
    const tokenHash = this.hash(token);
    const ttlDays = input.expiresInDays ?? DEFAULT_EXPIRES_IN_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const invite = await (this.prisma as any).patientInvite.create({
      data: {
        therapistId,
        email: input.email?.toLowerCase().trim() || null,
        notes: input.notes,
        tokenHash,
        expiresAt,
      },
    });

    await this.audit.log({
      userId: therapistId,
      actorId: therapistId,
      action: 'PATIENT_INVITE_CREATE',
      resourceType: 'PatientInvite',
      resourceId: invite.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
    });

    return {
      id: invite.id,
      // Plain token — показывается ОДИН раз клиенту. В БД не возвращается.
      token,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Публичный preview (без авторизации). Возвращает только имя терапевта
   * и срок — для UI приглашения. Не утечка: если token невалиден — 404.
   */
  async preview(token: string) {
    const tokenHash = this.hash(token);
    const invite = await (this.prisma as any).patientInvite.findUnique({
      where: { tokenHash },
      include: { therapist: { select: { id: true, name: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.revokedAt) throw new BadRequestException('Invite revoked');
    if (invite.acceptedAt) throw new BadRequestException('Invite already used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite expired');
    return {
      therapistName: invite.therapist.name,
      expiresAt: invite.expiresAt,
      requiresEmail: invite.email,
    };
  }

  /**
   * Принять invite. Создаёт/активирует TherapistPatient,
   * маркирует invite acceptedAt + acceptedByUserId. Идемпотентно (если
   * связь уже ACTIVE — реактивирует, audit-log пишет).
   */
  async accept(
    token: string,
    acceptingUser: { id: string; email: string },
    meta?: AuditMeta,
  ) {
    const tokenHash = this.hash(token);
    const invite = await (this.prisma as any).patientInvite.findUnique({
      where: { tokenHash },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.revokedAt) throw new BadRequestException('Invite revoked');
    if (invite.acceptedAt) throw new BadRequestException('Invite already used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite expired');

    // Если email указан в приглашении — должен совпадать с авторизованным.
    if (
      invite.email &&
      invite.email.toLowerCase() !== acceptingUser.email.toLowerCase()
    ) {
      throw new UnauthorizedException(
        'Этот invite предназначен другому email',
      );
    }

    // Терапевт не может «принять» собственное приглашение.
    if (invite.therapistId === acceptingUser.id) {
      throw new BadRequestException('Cannot accept your own invite');
    }

    // Создаём/реактивируем связь
    const relation = await this.prisma.therapistPatient.upsert({
      where: {
        therapistId_patientId: {
          therapistId: invite.therapistId,
          patientId: acceptingUser.id,
        },
      },
      update: { status: 'ACTIVE', dischargedAt: null },
      create: {
        therapistId: invite.therapistId,
        patientId: acceptingUser.id,
        status: 'ACTIVE',
      },
    });

    // Маркируем invite использованным
    await (this.prisma as any).patientInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: acceptingUser.id,
      },
    });

    await this.audit.log({
      userId: acceptingUser.id,
      actorId: acceptingUser.id,
      action: 'PATIENT_INVITE_ACCEPT',
      resourceType: 'PatientInvite',
      resourceId: invite.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
      details: { therapistId: invite.therapistId },
    });

    return {
      success: true,
      therapistId: invite.therapistId,
      relationId: relation.id,
    };
  }

  async list(therapistId: string, status?: 'active' | 'used' | 'revoked' | 'expired') {
    const now = new Date();
    const where: any = { therapistId };
    if (status === 'used') where.acceptedAt = { not: null };
    if (status === 'revoked') where.revokedAt = { not: null };
    if (status === 'expired') {
      where.expiresAt = { lt: now };
      where.acceptedAt = null;
      where.revokedAt = null;
    }
    if (status === 'active') {
      where.expiresAt = { gte: now };
      where.acceptedAt = null;
      where.revokedAt = null;
    }
    const items = await (this.prisma as any).patientInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        notes: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
        acceptedByUserId: true,
      },
    });
    return items;
  }

  async revoke(inviteId: string, therapistId: string, meta?: AuditMeta) {
    const invite = await (this.prisma as any).patientInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, therapistId: true, revokedAt: true, acceptedAt: true },
    });
    if (!invite || invite.therapistId !== therapistId) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.acceptedAt) {
      throw new BadRequestException('Cannot revoke accepted invite');
    }
    if (invite.revokedAt) {
      return { success: true, alreadyRevoked: true };
    }
    await (this.prisma as any).patientInvite.update({
      where: { id: inviteId },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      userId: therapistId,
      actorId: therapistId,
      action: 'PATIENT_INVITE_REVOKE',
      resourceType: 'PatientInvite',
      resourceId: inviteId,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
    });
    return { success: true };
  }
}
