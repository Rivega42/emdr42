import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  timelineEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  emotionRecord: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  sudsRecord: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  vocRecord: {
    create: jest.fn(),
  },
  safetyEvent: {
    create: jest.fn(),
  },
  therapistPatient: {
    findUnique: jest.fn(),
  },
};

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates session with correct userId and sessionNumber', async () => {
      const userId = 'user-1';
      const dto = { targetMemory: 'test memory' };

      mockPrisma.session.findFirst.mockResolvedValue({ sessionNumber: 3 });
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-1',
        userId,
        sessionNumber: 4,
        ...dto,
      });

      const result = await service.create(dto as any, userId);

      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { sessionNumber: 'desc' },
        select: { sessionNumber: true },
      });
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: { ...dto, userId, sessionNumber: 4 },
      });
      expect(result.sessionNumber).toBe(4);
    });
  });

  describe('findAll', () => {
    it('returns paginated sessions filtered by userId', async () => {
      const userId = 'user-1';
      const sessions = [
        { id: 's1', userId, sessionNumber: 1 },
        { id: 's2', userId, sessionNumber: 2 },
      ];

      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 20 }, userId, 'PATIENT');

      expect(result.data).toEqual(sessions);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns session with all relations', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        sessionNumber: 1,
        timelineEvents: [{ id: 'te1' }],
        emotionRecords: [{ id: 'er1' }],
        sudsRecords: [{ id: 'sr1' }],
        vocRecords: [{ id: 'vr1' }],
        safetyEvents: [{ id: 'se1' }],
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const result = await service.findOne('session-1', 'user-1', 'PATIENT');

      expect(result).toEqual(session);
      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: expect.objectContaining({
          timelineEvents: expect.any(Object),
          emotionRecords: expect.any(Object),
          sudsRecords: expect.any(Object),
          vocRecords: expect.any(Object),
          safetyEvents: expect.any(Object),
          user: expect.any(Object),
        }),
      });
    });

    it('throws for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-1', 'PATIENT')).rejects.toThrow(
        NotFoundException,
      );
    });

    // --- Therapist read-access (#222) ---

    it('allows ASSIGNED therapist to read patient session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'patient-1',
      });
      mockPrisma.therapistPatient.findUnique.mockResolvedValue({
        status: 'ACTIVE',
      });

      const result = await service.findOne('session-1', 'therapist-1', 'THERAPIST');

      expect(result.id).toBe('session-1');
      expect(mockPrisma.therapistPatient.findUnique).toHaveBeenCalledWith({
        where: {
          therapistId_patientId: {
            therapistId: 'therapist-1',
            patientId: 'patient-1',
          },
        },
        select: { status: true },
      });
    });

    it('rejects NON-assigned therapist (IDOR guard)', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'patient-1',
      });
      mockPrisma.therapistPatient.findUnique.mockResolvedValue(null);

      await expect(service.findOne('session-1', 'stranger-therapist', 'THERAPIST')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects therapist with DISCHARGED relation', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'patient-1',
      });
      mockPrisma.therapistPatient.findUnique.mockResolvedValue({
        status: 'DISCHARGED',
      });

      await expect(service.findOne('session-1', 'ex-therapist', 'THERAPIST')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getTranscript (therapist read-access, #222)', () => {
    it('allows assigned therapist to read transcript', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'patient-1',
        transcriptText: 'transcript body',
      });
      mockPrisma.therapistPatient.findUnique.mockResolvedValue({
        status: 'ACTIVE',
      });

      const result = await service.getTranscript('session-1', 'therapist-1', 'THERAPIST');
      expect(result.transcriptText).toBe('transcript body');
    });

    it('rejects non-assigned therapist for transcript', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'patient-1',
        transcriptText: 'secret',
      });
      mockPrisma.therapistPatient.findUnique.mockResolvedValue(null);

      await expect(service.getTranscript('session-1', 'stranger', 'THERAPIST')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('updates session fields', async () => {
      const session = { id: 'session-1', userId: 'user-1' };
      const dto = { status: 'COMPLETED' };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.session.update.mockResolvedValue({ ...session, ...dto });

      const result = await service.update('session-1', dto as any, 'user-1', 'PATIENT');

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: dto,
      });
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('addTimelineEvent', () => {
    it('creates event linked to session', async () => {
      const session = { id: 'session-1', userId: 'user-1' };
      const dto = {
        timestamp: Date.now(),
        type: 'phase_start',
        data: { phase: 'history' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.timelineEvent.create.mockResolvedValue({
        id: 'te-1',
        sessionId: 'session-1',
        ...dto,
      });

      const result = await service.addTimelineEvent('session-1', dto as any, 'user-1', 'PATIENT');

      expect(mockPrisma.timelineEvent.create).toHaveBeenCalledWith({
        data: { sessionId: 'session-1', ...dto },
      });
      expect(result.sessionId).toBe('session-1');
    });
  });

  describe('addEmotionRecords', () => {
    it('creates batch of emotion records', async () => {
      const session = { id: 'session-1', userId: 'user-1' };
      const dto = [
        { timestamp: 1000, stress: 0.5, engagement: 0.7 },
        { timestamp: 2000, stress: 0.3, engagement: 0.8 },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.emotionRecord.createMany.mockResolvedValue({ count: 2 });

      const result = await service.addEmotionRecords('session-1', dto as any, 'user-1', 'PATIENT');

      expect(mockPrisma.emotionRecord.createMany).toHaveBeenCalledWith({
        data: dto.map((r) => ({ sessionId: 'session-1', ...r })),
      });
      expect(result.count).toBe(2);
    });
  });

  describe('addSudsRecord', () => {
    it('creates SUDS record with value 0-10', async () => {
      const session = { id: 'session-1', userId: 'user-1' };
      const dto = { timestamp: Date.now(), value: 7, context: 'baseline' };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.sudsRecord.create.mockResolvedValue({
        id: 'suds-1',
        sessionId: 'session-1',
        ...dto,
      });

      const result = await service.addSudsRecord('session-1', dto as any, 'user-1', 'PATIENT');

      expect(mockPrisma.sudsRecord.create).toHaveBeenCalledWith({
        data: { sessionId: 'session-1', ...dto },
      });
      expect(result.value).toBe(7);
    });
  });

  describe('addVocRecord', () => {
    it('creates VOC record with value 1-7', async () => {
      const session = { id: 'session-1', userId: 'user-1' };
      const dto = { timestamp: Date.now(), value: 5, context: 'installation' };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.vocRecord.create.mockResolvedValue({
        id: 'voc-1',
        sessionId: 'session-1',
        ...dto,
      });

      const result = await service.addVocRecord('session-1', dto as any, 'user-1', 'PATIENT');

      expect(mockPrisma.vocRecord.create).toHaveBeenCalledWith({
        data: { sessionId: 'session-1', ...dto },
      });
      expect(result.value).toBe(5);
    });
  });

  describe('addSafetyEvent', () => {
    it('creates safety event', async () => {
      const session = { id: 'session-1', userId: 'user-1' };
      const dto = {
        timestamp: Date.now(),
        type: 'dissociation',
        severity: 'high',
        actionTaken: 'grounding',
        resolved: false,
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.safetyEvent.create.mockResolvedValue({
        id: 'se-1',
        sessionId: 'session-1',
        ...dto,
      });

      const result = await service.addSafetyEvent('session-1', dto as any, 'user-1', 'PATIENT');

      expect(mockPrisma.safetyEvent.create).toHaveBeenCalledWith({
        data: { sessionId: 'session-1', ...dto },
      });
      expect(result.type).toBe('dissociation');
    });
  });

  describe('compareSessions', () => {
    it('calculates deltas and effectiveness score', async () => {
      const currentSession = {
        id: 'session-2',
        userId: 'user-1',
        sessionNumber: 2,
        sudsFinal: 3,
        sudsBaseline: 8,
        vocFinal: 6,
        vocBaseline: 2,
        emotionRecords: [{ stress: 0.3 }, { stress: 0.4 }],
        timelineEvents: [],
        sudsRecords: [],
        vocRecords: [],
        safetyEvents: [],
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      };

      const previousSession = {
        id: 'session-1',
        userId: 'user-1',
        sessionNumber: 1,
        sudsFinal: 5,
        sudsBaseline: 9,
        vocFinal: 4,
        vocBaseline: 1,
        emotionRecords: [{ stress: 0.6 }, { stress: 0.7 }],
        timelineEvents: [],
        sudsRecords: [],
        vocRecords: [],
        safetyEvents: [],
        user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      };

      // findOne is called twice (for current and previous)
      mockPrisma.session.findUnique
        .mockResolvedValueOnce(currentSession)
        .mockResolvedValueOnce(previousSession);

      const result = await service.compareSessions('session-2', 'session-1', 'user-1', 'PATIENT');

      expect(result.current.id).toBe('session-2');
      expect(result.previous.id).toBe('session-1');
      expect(result.comparison.sudsDelta).toBe(-2); // 3 - 5
      expect(result.comparison.vocDelta).toBe(2); // 6 - 4
      expect(result.comparison.avgStressDelta).toBeCloseTo(-0.3); // 0.35 - 0.65
      expect(result.comparison.effectivenessScore).not.toBeNull();
      expect(typeof result.comparison.effectivenessScore).toBe('number');
    });
  });

  describe('getEmotionalPeaks (#240)', () => {
    // Утилита: трек из 15 точек с одним ярким stress-пиком на индексе 7.
    const buildTrack = () => {
      const baseValues = [
        0.3, 0.3, 0.4, 0.3, 0.3, 0.4, 0.5, 0.85, 0.5, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3,
      ];
      return baseValues.map((stress, i) => ({
        id: `e${i}`,
        sessionId: 'session-1',
        timestamp: i, // секунды
        stress,
        engagement: 0.5,
        positivity: 0.5,
        arousal: 0.5,
        valence: 0,
        joy: 0.1,
        sadness: 0.1,
        anger: 0.05,
        fear: 0.1,
        confidence: 0.85,
      }));
    };

    it('возвращает пик stress с привязкой к фазе и ближайшему SUDS', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
      });
      mockPrisma.emotionRecord.findMany.mockResolvedValue(buildTrack());
      mockPrisma.timelineEvent.findMany.mockResolvedValue([
        { timestamp: 0, type: 'phase_start', data: { phase: 'preparation' } },
        { timestamp: 5, type: 'phase_start', data: { phase: 'desensitization' } },
      ]);
      mockPrisma.sudsRecord.findMany.mockResolvedValue([
        { timestamp: 1, value: 8 },
        { timestamp: 6, value: 6 },
      ]);

      const result = await service.getEmotionalPeaks('session-1', 'user-1', 'PATIENT', { topN: 5 });

      const stressPeak = result.peaks.find((p) => p.metric === 'stress');
      expect(stressPeak).toBeDefined();
      expect(stressPeak!.value).toBe(0.85);
      // timestamp в EmotionSnapshot — мс, проверяем что = индекс * 1000
      expect(stressPeak!.timestamp).toBe(7000);
      // Фаза desensitization (началась в timestamp=5, пик на 7)
      expect(stressPeak!.phase).toBe('desensitization');
      // Ближайший SUDS до пика — 6 (timestamp=6, пик на 7)
      expect(stressPeak!.nearestSudsValue).toBe(6);
      expect(result.totalEmotionRecords).toBe(15);
    });

    it('пустой трек — пустые пики', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
      });
      mockPrisma.emotionRecord.findMany.mockResolvedValue([]);
      mockPrisma.timelineEvent.findMany.mockResolvedValue([]);
      mockPrisma.sudsRecord.findMany.mockResolvedValue([]);

      const result = await service.getEmotionalPeaks('session-1', 'user-1', 'PATIENT', { topN: 5 });
      expect(result.peaks).toEqual([]);
      expect(result.totalEmotionRecords).toBe(0);
    });

    it('non-assigned терапевт — 403', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'patient-1',
      });
      mockPrisma.therapistPatient.findUnique.mockResolvedValue(null);

      await expect(
        service.getEmotionalPeaks('session-1', 'stranger', 'THERAPIST', {
          topN: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
