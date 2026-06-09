import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PatientInviteService } from './patient-invite.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockPrisma: any = {
  patientInvite: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  therapistPatient: {
    upsert: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('PatientInviteService', () => {
  let service: PatientInviteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientInviteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get(PatientInviteService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('возвращает plain-token + сохраняет только sha256(token)', async () => {
      mockPrisma.patientInvite.count.mockResolvedValue(0);
      mockPrisma.patientInvite.create.mockImplementation(async (args: any) => ({
        id: 'inv-1',
        ...args.data,
      }));

      const result = await service.create(
        'therapist-1',
        { email: 'patient@example.com' },
        {},
      );

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(20);
      // BD получила hash, а не plain
      const stored = mockPrisma.patientInvite.create.mock.calls[0][0].data;
      expect(stored.tokenHash).not.toBe(result.token);
      expect(stored.tokenHash.length).toBe(64); // sha256 hex
      // Email нормализуется в lowercase
      expect(stored.email).toBe('patient@example.com');
    });

    it('throws BadRequestException при превышении rate-limit (20/час)', async () => {
      mockPrisma.patientInvite.count.mockResolvedValue(20);
      await expect(
        service.create('therapist-1', {}, {}),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.patientInvite.create).not.toHaveBeenCalled();
    });

    it('кастомный expiresInDays учитывается', async () => {
      mockPrisma.patientInvite.count.mockResolvedValue(0);
      mockPrisma.patientInvite.create.mockImplementation(async (args: any) => ({
        id: 'inv-1',
        ...args.data,
      }));

      const before = Date.now();
      const result = await service.create('therapist-1', { expiresInDays: 7 }, {});
      const expiresAt = (result.expiresAt as Date).getTime();
      // 7 дней ± час
      expect(expiresAt).toBeGreaterThan(before + 6.9 * 86400_000);
      expect(expiresAt).toBeLessThan(before + 7.1 * 86400_000);
    });
  });

  describe('preview', () => {
    const futureDate = new Date(Date.now() + 86400_000);

    it('возвращает therapistName + expiresAt для валидного invite', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 't1',
        email: 'p@example.com',
        acceptedAt: null,
        revokedAt: null,
        expiresAt: futureDate,
        therapist: { id: 't1', name: 'Dr Alice' },
      });
      const result = await service.preview('any-token');
      expect(result.therapistName).toBe('Dr Alice');
      expect(result.requiresEmail).toBe('p@example.com');
    });

    it('NotFoundException для несуществующего token', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue(null);
      await expect(service.preview('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('BadRequestException для revoked / accepted / expired', async () => {
      // revoked
      mockPrisma.patientInvite.findUnique.mockResolvedValueOnce({
        id: 'inv-1',
        revokedAt: new Date(),
        expiresAt: futureDate,
        therapist: { id: 't1', name: 'Dr' },
      });
      await expect(service.preview('t')).rejects.toThrow(BadRequestException);
      // accepted
      mockPrisma.patientInvite.findUnique.mockResolvedValueOnce({
        id: 'inv-1',
        revokedAt: null,
        acceptedAt: new Date(),
        expiresAt: futureDate,
        therapist: { id: 't1', name: 'Dr' },
      });
      await expect(service.preview('t')).rejects.toThrow(BadRequestException);
      // expired
      mockPrisma.patientInvite.findUnique.mockResolvedValueOnce({
        id: 'inv-1',
        revokedAt: null,
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        therapist: { id: 't1', name: 'Dr' },
      });
      await expect(service.preview('t')).rejects.toThrow(BadRequestException);
    });
  });

  describe('accept', () => {
    const futureDate = new Date(Date.now() + 86400_000);

    it('создаёт TherapistPatient и маркирует invite (happy path)', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 't1',
        email: null,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: futureDate,
      });
      mockPrisma.therapistPatient.upsert.mockResolvedValue({ id: 'tp-1' });
      mockPrisma.patientInvite.update.mockResolvedValue({});

      const result = await service.accept(
        'token',
        { id: 'user-2', email: 'p@example.com' },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.therapistId).toBe('t1');
      // upsert вызван с правильными ключами + статус ACTIVE
      const upsertArgs = mockPrisma.therapistPatient.upsert.mock.calls[0][0];
      expect(upsertArgs.where.therapistId_patientId).toEqual({
        therapistId: 't1',
        patientId: 'user-2',
      });
      expect(upsertArgs.update.status).toBe('ACTIVE');
      // invite помечен acceptedAt
      expect(mockPrisma.patientInvite.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          acceptedAt: expect.any(Date),
          acceptedByUserId: 'user-2',
        }),
      });
    });

    it('UnauthorizedException если email не совпадает', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 't1',
        email: 'specific@example.com',
        revokedAt: null,
        acceptedAt: null,
        expiresAt: futureDate,
      });
      await expect(
        service.accept('t', { id: 'u2', email: 'other@example.com' }, {}),
      ).rejects.toThrow(UnauthorizedException);
      // Без побочных эффектов
      expect(mockPrisma.therapistPatient.upsert).not.toHaveBeenCalled();
    });

    it('BadRequestException если терапевт принимает собственный invite', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 'me',
        email: null,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: futureDate,
      });
      await expect(
        service.accept('t', { id: 'me', email: 'me@x.com' }, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revoke', () => {
    it('помечает revokedAt + audit', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 't1',
        revokedAt: null,
        acceptedAt: null,
      });
      mockPrisma.patientInvite.update.mockResolvedValue({});
      const result = await service.revoke('inv-1', 't1', {});
      expect(result.success).toBe(true);
      expect(mockPrisma.patientInvite.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });

    it('NotFoundException для чужого invite (ownership check)', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 'OTHER',
        revokedAt: null,
        acceptedAt: null,
      });
      await expect(service.revoke('inv-1', 'me', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('idempotent для уже revoked invite', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 't1',
        revokedAt: new Date(),
        acceptedAt: null,
      });
      const result = await service.revoke('inv-1', 't1', {});
      expect(result.success).toBe(true);
      expect((result as any).alreadyRevoked).toBe(true);
      // Никаких побочных update
      expect(mockPrisma.patientInvite.update).not.toHaveBeenCalled();
    });

    it('BadRequestException для accepted invite', async () => {
      mockPrisma.patientInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        therapistId: 't1',
        revokedAt: null,
        acceptedAt: new Date(),
      });
      await expect(service.revoke('inv-1', 't1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
