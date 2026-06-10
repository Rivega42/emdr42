import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PatientInviteService } from '../therapist-patient/patient-invite.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/create-lead.dto';

/**
 * #161 — IntakeService: приём заявок с маркетингового сайта.
 *
 * Spam protection: rate-limit (5/час/IP, 3/24ч/email) + honeypot + consent.
 * Convert → создаёт PatientInvite (#160) для associate с assigned therapist.
 */
@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invites: PatientInviteService,
  ) {}

  /** Публичный submit (без auth). */
  async submit(dto: CreateLeadDto, meta: { ip?: string; userAgent?: string }) {
    // Honeypot — silent 200, без записи.
    if (dto._hp && dto._hp.length > 0) {
      this.logger.warn(`[intake] honeypot triggered from ${meta.ip}`);
      return { received: true };
    }
    if (!dto.consent) {
      throw new BadRequestException('Согласие на обработку ПДн обязательно');
    }

    // Rate-limit: 5/час/IP, 3/24ч/email.
    const oneHour = new Date(Date.now() - 60 * 60 * 1000);
    const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [byIp, byEmail] = await Promise.all([
      meta.ip
        ? (this.prisma as any).lead.count({
            where: { ipAddress: meta.ip, createdAt: { gte: oneHour } },
          })
        : Promise.resolve(0),
      (this.prisma as any).lead.count({
        where: {
          email: dto.email.toLowerCase().trim(),
          createdAt: { gte: oneDay },
        },
      }),
    ]);
    if (byIp >= 5 || byEmail >= 3) {
      throw new BadRequestException('Слишком много заявок. Попробуйте позже.');
    }

    const lead = await (this.prisma as any).lead.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name,
        phone: dto.phone,
        source: dto.source,
        utm: dto.utm,
        preferredContactChannel: dto.preferredContactChannel,
        preferredTime: dto.preferredTime,
        message: dto.message,
        consentAt: new Date(),
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    await this.audit.log({
      userId: undefined,
      action: 'LEAD_CREATE',
      resourceType: 'Lead',
      resourceId: lead.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      success: true,
      details: { source: dto.source, status: 'NEW' },
    });

    return { received: true, leadId: lead.id };
  }

  async list(query: {
    status?: string;
    assignedTherapistId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const take = Math.min(Math.max(query.pageSize ?? 50, 1), 100);
    const skip = (Math.max(query.page ?? 1, 1) - 1) * take;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.assignedTherapistId) where.assignedTherapistId = query.assignedTherapistId;
    const [items, total] = await Promise.all([
      (this.prisma as any).lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      (this.prisma as any).lead.count({ where }),
    ]);
    return { items, total, page: query.page ?? 1, pageSize: take };
  }

  async update(
    id: string,
    actorId: string,
    dto: UpdateLeadDto,
    meta?: { ip?: string; userAgent?: string },
    actorRole?: string,
  ) {
    const existing = await (this.prisma as any).lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    // Ownership (#233): THERAPIST не может перехватывать чужие лиды.
    //  - менять можно только свои или неназначенные лиды;
    //  - assignedTherapistId можно ставить только на себя (или снимать).
    // Произвольное переназначение — ADMIN.
    if (actorRole === 'THERAPIST') {
      if (existing.assignedTherapistId && existing.assignedTherapistId !== actorId) {
        throw new ForbiddenException('Лид назначен другому терапевту');
      }
      if (
        dto.assignedTherapistId !== undefined &&
        dto.assignedTherapistId !== null &&
        dto.assignedTherapistId !== actorId
      ) {
        throw new ForbiddenException('Терапевт может назначать лиды только на себя');
      }
    }
    const updated = await (this.prisma as any).lead.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      actorId,
      action: 'LEAD_UPDATE',
      resourceType: 'Lead',
      resourceId: id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      details: {
        from: { status: existing.status, assigned: existing.assignedTherapistId },
        to: { status: dto.status, assigned: dto.assignedTherapistId },
      },
    });
    return updated;
  }

  /** Convert: создаём invite для assigned therapist и помечаем CONVERTED. */
  async convert(
    leadId: string,
    actorId: string,
    meta?: { ip?: string; userAgent?: string },
    actorRole?: string,
  ) {
    const lead = await (this.prisma as any).lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (!lead.assignedTherapistId) {
      throw new BadRequestException('Сначала назначьте терапевта');
    }
    // Ownership (#233): THERAPIST конвертирует только свои лиды.
    if (actorRole === 'THERAPIST' && lead.assignedTherapistId !== actorId) {
      throw new ForbiddenException('Лид назначен другому терапевту');
    }
    if (lead.status === 'CONVERTED' || lead.convertedUserId) {
      throw new BadRequestException('Лид уже сконвертирован');
    }
    const invite = await this.invites.create(
      lead.assignedTherapistId,
      { email: lead.email, notes: `Из лида ${leadId}` },
      meta,
    );
    await (this.prisma as any).lead.update({
      where: { id: leadId },
      data: { status: 'CONVERTED' },
    });
    await this.audit.log({
      actorId,
      action: 'LEAD_CONVERT',
      resourceType: 'Lead',
      resourceId: leadId,
      details: { inviteId: invite.id, therapistId: lead.assignedTherapistId },
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return { inviteToken: invite.token, inviteId: invite.id, expiresAt: invite.expiresAt };
  }
}
