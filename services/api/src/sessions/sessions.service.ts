import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { CreateEmotionRecordDto } from './dto/create-emotion-record.dto';
import { CreateSudsRecordDto } from './dto/create-suds-record.dto';
import { CreateVocRecordDto } from './dto/create-voc-record.dto';
import { CreateSafetyEventDto } from './dto/create-safety-event.dto';
import { SessionQueryDto } from './dto/session-query.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateSessionDto & { therapistId?: string },
    userId: string,
  ) {
    const lastSession = await this.prisma.session.findFirst({
      where: { userId },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });

    const sessionNumber = (lastSession?.sessionNumber ?? 0) + 1;

    // Validate therapist assignment if provided (#112)
    if (dto.therapistId) {
      const rel = await (this.prisma as any).therapistPatient.findUnique({
        where: {
          therapistId_patientId: {
            therapistId: dto.therapistId,
            patientId: userId,
          },
        },
      });
      if (!rel || rel.status === 'DISCHARGED') {
        throw new ForbiddenException(
          'Указанный терапевт не назначен этому пациенту',
        );
      }
    }

    const { therapistId, ...sessionData } = dto as any;
    return this.prisma.session.create({
      data: {
        ...sessionData,
        userId,
        sessionNumber,
        ...(therapistId ? { therapistId } : {}),
      },
    });
  }

  async findAll(query: SessionQueryDto, userId: string, userRole: string) {
    const { page = 1, limit = 20, status, filterUserId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Non-admins can only see their own sessions
    if (userRole !== 'ADMIN') {
      where.userId = userId;
    } else if (filterUserId) {
      where.userId = filterUserId;
    }

    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data: sessions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string, userRole: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        timelineEvents: { orderBy: { timestamp: 'asc' } },
        emotionRecords: { orderBy: { timestamp: 'asc' } },
        sudsRecords: { orderBy: { timestamp: 'asc' } },
        vocRecords: { orderBy: { timestamp: 'asc' } },
        safetyEvents: { orderBy: { timestamp: 'asc' } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (userRole !== 'ADMIN' && session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }

  async update(
    id: string,
    dto: UpdateSessionDto,
    userId: string,
    userRole: string,
  ) {
    const session = await this.ensureAccess(id, userId, userRole);

    return this.prisma.session.update({
      where: { id: session.id },
      data: dto,
    });
  }

  async addTimelineEvent(
    sessionId: string,
    dto: CreateTimelineEventDto,
    userId: string,
    userRole: string,
  ) {
    await this.ensureAccess(sessionId, userId, userRole);

    return this.prisma.timelineEvent.create({
      data: { sessionId, ...dto },
    });
  }

  async addEmotionRecords(
    sessionId: string,
    dto: CreateEmotionRecordDto[],
    userId: string,
    userRole: string,
  ) {
    await this.ensureAccess(sessionId, userId, userRole);

    return this.prisma.emotionRecord.createMany({
      data: dto.map((record) => ({ sessionId, ...record })),
    });
  }

  async addSudsRecord(
    sessionId: string,
    dto: CreateSudsRecordDto,
    userId: string,
    userRole: string,
  ) {
    await this.ensureAccess(sessionId, userId, userRole);

    return this.prisma.sudsRecord.create({
      data: { sessionId, ...dto },
    });
  }

  async addVocRecord(
    sessionId: string,
    dto: CreateVocRecordDto,
    userId: string,
    userRole: string,
  ) {
    await this.ensureAccess(sessionId, userId, userRole);

    return this.prisma.vocRecord.create({
      data: { sessionId, ...dto },
    });
  }

  async addSafetyEvent(
    sessionId: string,
    dto: CreateSafetyEventDto,
    userId: string,
    userRole: string,
  ) {
    await this.ensureAccess(sessionId, userId, userRole);

    return this.prisma.safetyEvent.create({
      data: { sessionId, ...dto },
    });
  }

  async compareSessions(
    id: string,
    previousId: string,
    userId: string,
    userRole: string,
  ) {
    const [current, previous] = await Promise.all([
      this.findOne(id, userId, userRole),
      this.findOne(previousId, userId, userRole),
    ]);

    const avgStress = (records: { stress: number }[]) =>
      records.length
        ? records.reduce((sum, r) => sum + r.stress, 0) / records.length
        : null;

    const currentAvgStress = avgStress(current.emotionRecords);
    const previousAvgStress = avgStress(previous.emotionRecords);

    const sudsDelta =
      current.sudsFinal != null && previous.sudsFinal != null
        ? current.sudsFinal - previous.sudsFinal
        : null;

    const vocDelta =
      current.vocFinal != null && previous.vocFinal != null
        ? current.vocFinal - previous.vocFinal
        : null;

    const avgStressDelta =
      currentAvgStress != null && previousAvgStress != null
        ? currentAvgStress - previousAvgStress
        : null;

    // Effectiveness: weighted score based on SUDS reduction, VOC increase, stress reduction
    let effectivenessScore: number | null = null;
    const scores: number[] = [];

    if (current.sudsFinal != null && current.sudsBaseline != null) {
      const sudsReduction =
        (current.sudsBaseline - current.sudsFinal) / Math.max(current.sudsBaseline, 1);
      scores.push(sudsReduction);
    }

    if (current.vocFinal != null && current.vocBaseline != null) {
      const vocIncrease =
        (current.vocFinal - current.vocBaseline) / 6; // max improvement is 6 (1->7)
      scores.push(vocIncrease);
    }

    if (currentAvgStress != null && previousAvgStress != null) {
      const stressReduction = (previousAvgStress - currentAvgStress) / Math.max(previousAvgStress, 0.01);
      scores.push(stressReduction);
    }

    if (scores.length > 0) {
      effectivenessScore = Math.round(
        (scores.reduce((a, b) => a + b, 0) / scores.length) * 100,
      );
    }

    return {
      current: {
        id: current.id,
        sessionNumber: current.sessionNumber,
        sudsFinal: current.sudsFinal,
        vocFinal: current.vocFinal,
        avgStress: currentAvgStress,
      },
      previous: {
        id: previous.id,
        sessionNumber: previous.sessionNumber,
        sudsFinal: previous.sudsFinal,
        vocFinal: previous.vocFinal,
        avgStress: previousAvgStress,
      },
      comparison: {
        sudsDelta,
        vocDelta,
        avgStressDelta,
        effectivenessScore,
      },
    };
  }

  private async ensureAccess(id: string, userId: string, userRole: string) {
    const session = await this.prisma.session.findUnique({ where: { id } });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (userRole !== 'ADMIN' && session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }

  // --- Recording metadata (#122) ---

  async recordConsent(
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<{ recordingConsentAt: Date }> {
    await this.ensureAccess(sessionId, userId, userRole);
    const now = new Date();
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { recordingConsentAt: now },
    });
    return { recordingConsentAt: now };
  }

  async attachRecording(
    sessionId: string,
    userId: string,
    userRole: string,
    data: {
      recordingUrl: string;
      recordingStorageKey: string;
      recordingEncryptionKeyId?: string;
    },
  ) {
    const session = await this.ensureAccess(sessionId, userId, userRole);
    if (!session.recordingConsentAt) {
      throw new ForbiddenException(
        'Cannot attach recording without patient consent (call POST /sessions/:id/recording-consent first)',
      );
    }
    return this.prisma.session.update({
      where: { id: sessionId },
      data,
      select: {
        id: true,
        recordingUrl: true,
        recordingStorageKey: true,
        recordingConsentAt: true,
      },
    });
  }

  async saveTranscript(
    sessionId: string,
    userId: string,
    userRole: string,
    transcriptText: string,
  ) {
    await this.ensureAccess(sessionId, userId, userRole);
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { transcriptText },
      select: { id: true },
    });
  }

  async getTranscript(
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<{ transcriptText: string | null }> {
    const session = await this.ensureAccess(sessionId, userId, userRole);
    return { transcriptText: session.transcriptText ?? null };
  }
}
