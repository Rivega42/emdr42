import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TherapistService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all patients (for therapists). Future: filter by assigned patients. */
  async getPatients(pagination: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'PATIENT', isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          _count: { select: { sessions: true } },
          sessions: {
            where: { status: 'COMPLETED' },
            select: { sudsBaseline: true, sudsFinal: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where: { role: 'PATIENT', isActive: true } }),
    ]);

    const data = patients.map((p: any) => {
      const lastSession = p.sessions[0];
      return {
        id: p.id,
        email: p.email,
        name: p.name,
        createdAt: p.createdAt,
        totalSessions: p._count.sessions,
        lastSudsReduction:
          lastSession?.sudsBaseline != null && lastSession?.sudsFinal != null
            ? lastSession.sudsBaseline - lastSession.sudsFinal
            : null,
        lastSessionDate: lastSession?.createdAt ?? null,
      };
    });

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /** Get a patient's session history. */
  async getPatientSessions(
    patientId: string,
    pagination: { page?: number; limit?: number },
  ) {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId: patientId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sudsRecords: { orderBy: { timestamp: 'desc' }, take: 1 },
          vocRecords: { orderBy: { timestamp: 'desc' }, take: 1 },
          safetyEvents: true,
        },
      }),
      this.prisma.session.count({ where: { userId: patientId } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /** Get patient's progress (SUDS/VOC trends). */
  async getPatientProgress(patientId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId: patientId, status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        sessionNumber: true,
        sudsBaseline: true,
        sudsFinal: true,
        vocBaseline: true,
        vocFinal: true,
        durationSeconds: true,
        createdAt: true,
      },
    });

    return { sessions, total: sessions.length };
  }

  /** Add a note to a session. */
  async addNote(sessionId: string, authorId: string, content: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.therapistNote.create({
      data: { sessionId, authorId, content },
    });
  }

  /** Get notes for a session. */
  async getNotes(sessionId: string) {
    return this.prisma.therapistNote.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
