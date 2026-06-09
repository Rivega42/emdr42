import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PatientInviteService } from '../therapist-patient/patient-invite.service';

const mockPrisma: any = {
  lead: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockInvites = {
  create: jest.fn().mockResolvedValue({
    id: 'inv-1',
    token: 'plain-token',
    expiresAt: new Date(Date.now() + 86400_000 * 14),
  }),
};

describe('IntakeService', () => {
  let service: IntakeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntakeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: PatientInviteService, useValue: mockInvites },
      ],
    }).compile();
    service = module.get(IntakeService);
    jest.clearAllMocks();
  });

  describe('submit (public)', () => {
    const baseDto: any = {
      email: 'patient@example.com',
      consent: true,
    };

    it('создаёт Lead + audit при валидной заявке', async () => {
      mockPrisma.lead.count.mockResolvedValue(0);
      mockPrisma.lead.create.mockResolvedValue({ id: 'lead-1' });
      const result = await service.submit(baseDto, { ip: '1.1.1.1' });
      expect(result).toEqual({ received: true, leadId: 'lead-1' });
      expect(mockPrisma.lead.create).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LEAD_CREATE' }),
      );
    });

    it('honeypot → silent 200 без записи', async () => {
      const result = await service.submit(
        { ...baseDto, _hp: 'bot-filled' },
        { ip: '1.1.1.1' },
      );
      expect(result).toEqual({ received: true });
      expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    });

    it('BadRequest если consent=false', async () => {
      await expect(
        service.submit({ ...baseDto, consent: false }, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('BadRequest rate-limit по IP (5/час)', async () => {
      mockPrisma.lead.count.mockResolvedValueOnce(5).mockResolvedValueOnce(0);
      await expect(service.submit(baseDto, { ip: '1.1.1.1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    });

    it('BadRequest rate-limit по email (3/24ч)', async () => {
      // Без IP проверяется только email. count вызывается 1 раз.
      mockPrisma.lead.count.mockResolvedValueOnce(3);
      await expect(service.submit(baseDto, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('email нормализуется в lowercase', async () => {
      mockPrisma.lead.count.mockResolvedValue(0);
      mockPrisma.lead.create.mockResolvedValue({ id: 'lead-1' });
      await service.submit(
        { ...baseDto, email: 'UPPER@Example.COM ' },
        {},
      );
      const data = mockPrisma.lead.create.mock.calls[0][0].data;
      expect(data.email).toBe('upper@example.com');
    });
  });

  describe('update', () => {
    it('обновляет status + audit', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'l1',
        status: 'NEW',
        assignedTherapistId: null,
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'l1',
        status: 'CONTACTED',
      });
      const result = await service.update('l1', 'admin-1', {
        status: 'CONTACTED',
      });
      expect(result.status).toBe('CONTACTED');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LEAD_UPDATE' }),
      );
    });

    it('NotFound для несуществующего lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', 'a1', { status: 'CONTACTED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('convert', () => {
    it('создаёт invite через PatientInviteService + помечает CONVERTED', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'l1',
        email: 'p@example.com',
        status: 'QUALIFIED',
        assignedTherapistId: 't1',
        convertedUserId: null,
      });
      mockPrisma.lead.update.mockResolvedValue({});
      const result = await service.convert('l1', 'admin-1', {});
      expect(result.inviteToken).toBe('plain-token');
      expect(mockInvites.create).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ email: 'p@example.com' }),
        expect.any(Object),
      );
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: { status: 'CONVERTED' },
      });
    });

    it('BadRequest если не назначен терапевт', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'l1',
        assignedTherapistId: null,
        status: 'NEW',
      });
      await expect(service.convert('l1', 'admin-1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(mockInvites.create).not.toHaveBeenCalled();
    });

    it('BadRequest если уже converted', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'l1',
        assignedTherapistId: 't1',
        status: 'CONVERTED',
        convertedUserId: null,
      });
      await expect(service.convert('l1', 'admin-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
