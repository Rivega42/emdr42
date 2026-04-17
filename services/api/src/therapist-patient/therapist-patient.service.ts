import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AssignPatientDto } from './dto/assign-patient.dto';
import { CreateNoteDto, NoteVisibility } from './dto/create-note.dto';

/**
 * TherapistPatientService (#112).
 *
 * Управление связями therapist↔patient и терапевтическими заметками.
 * Все изменения логируются в AuditLog.
 */
@Injectable()
export class TherapistPatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async assignPatient(
    therapistId: string,
    dto: AssignPatientDto,
    meta?: { ip?: string; userAgent?: string; correlationId?: string },
  ) {
    if (therapistId === dto.patientId) {
      throw new BadRequestException('Cannot assign yourself as own patient');
    }

    const [therapist, patient] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: therapistId } }),
      this.prisma.user.findUnique({ where: { id: dto.patientId } }),
    ]);

    if (!therapist || therapist.role !== 'THERAPIST') {
      throw new ForbiddenException('Only therapists can assign patients');
    }
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    if (patient.deletedAt) {
      throw new NotFoundException('Patient deleted');
    }

    const relation = await this.prisma.therapistPatient.upsert({
      where: {
        therapistId_patientId: {
          therapistId,
          patientId: dto.patientId,
        },
      },
      update: {
        status: 'ACTIVE',
        notes: dto.notes,
        dischargedAt: null,
      },
      create: {
        therapistId,
        patientId: dto.patientId,
        status: 'ACTIVE',
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: dto.patientId,
      actorId: therapistId,
      action: 'PATIENT_ASSIGN',
      resourceType: 'TherapistPatient',
      resourceId: relation.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
      details: { notes: dto.notes },
    });

    return relation;
  }

  async dischargePatient(
    therapistId: string,
    patientId: string,
    meta?: { ip?: string; userAgent?: string; correlationId?: string },
  ) {
    const relation = await this.prisma.therapistPatient.findUnique({
      where: { therapistId_patientId: { therapistId, patientId } },
    });
    if (!relation) throw new NotFoundException('Relationship not found');

    const updated = await this.prisma.therapistPatient.update({
      where: { id: relation.id },
      data: { status: 'DISCHARGED', dischargedAt: new Date() },
    });

    await this.audit.log({
      userId: patientId,
      actorId: therapistId,
      action: 'PATIENT_DISCHARGE',
      resourceType: 'TherapistPatient',
      resourceId: relation.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
    });

    return updated;
  }

  async listPatientsForTherapist(therapistId: string, page = 1, pageSize = 50) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.therapistPatient.findMany({
        where: { therapistId, status: { not: 'DISCHARGED' } },
        include: {
          patient: {
            select: { id: true, email: true, name: true, createdAt: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.therapistPatient.count({
        where: { therapistId, status: { not: 'DISCHARGED' } },
      }),
    ]);

    return { items, total, page, pageSize: take };
  }

  async listTherapistsForPatient(patientId: string) {
    return this.prisma.therapistPatient.findMany({
      where: { patientId, status: 'ACTIVE' },
      include: {
        therapist: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async ensureTherapistCanAccessPatient(therapistId: string, patientId: string) {
    const rel = await this.prisma.therapistPatient.findUnique({
      where: { therapistId_patientId: { therapistId, patientId } },
    });
    if (!rel || rel.status === 'DISCHARGED') {
      throw new ForbiddenException(
        'Therapist has no active assignment to this patient',
      );
    }
    return rel;
  }

  async createNote(
    therapistId: string,
    dto: CreateNoteDto,
    meta?: { ip?: string; userAgent?: string; correlationId?: string },
  ) {
    await this.ensureTherapistCanAccessPatient(therapistId, dto.patientId);

    const note = await this.prisma.therapistNote.create({
      data: {
        therapistId,
        patientId: dto.patientId,
        sessionId: dto.sessionId,
        content: dto.content,
        visibility: dto.visibility ?? NoteVisibility.PRIVATE,
      },
    });

    await this.audit.log({
      userId: dto.patientId,
      actorId: therapistId,
      action: 'NOTE_CREATE',
      resourceType: 'TherapistNote',
      resourceId: note.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      correlationId: meta?.correlationId,
    });

    return note;
  }

  async listNotes(
    therapistId: string,
    patientId: string,
    page = 1,
    pageSize = 50,
  ) {
    await this.ensureTherapistCanAccessPatient(therapistId, patientId);
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.therapistNote.findMany({
        where: { therapistId, patientId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.therapistNote.count({ where: { therapistId, patientId } }),
    ]);

    return { items, total, page, pageSize: take };
  }
}
