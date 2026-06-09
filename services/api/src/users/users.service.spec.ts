import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const makeTx = () => ({
  safetyEvent: { deleteMany: jest.fn() },
  emotionRecord: { deleteMany: jest.fn() },
  sudsRecord: { deleteMany: jest.fn() },
  vocRecord: { deleteMany: jest.fn() },
  timelineEvent: { deleteMany: jest.fn() },
  session: { deleteMany: jest.fn() },
  therapistNote: { deleteMany: jest.fn() },
  therapistPatient: { deleteMany: jest.fn() },
  crisisEvent: { deleteMany: jest.fn() },
  refreshToken: { deleteMany: jest.fn() },
  verificationToken: { deleteMany: jest.fn() },
  subscription: { deleteMany: jest.fn() },
  userProgress: { deleteMany: jest.fn() },
  lead: { updateMany: jest.fn() },
  user: { delete: jest.fn() },
});

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  session: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  therapistPatient: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
    // Шёлковая совместимость: findFirst делегирует на findUnique.
    // После добавления `deletedAt: null` фильтра findOne использует findFirst,
    // а старые тесты мочат только findUnique.
    mockPrisma.user.findFirst.mockImplementation((args: any) =>
      mockPrisma.user.findUnique(args),
    );
  });

  describe('findAll', () => {
    it('returns paginated users', async () => {
      const users = [
        { id: 'u1', email: 'a@test.com', name: 'A', role: 'PATIENT', isActive: true },
        { id: 'u2', email: 'b@test.com', name: 'B', role: 'PATIENT', isActive: true },
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(users);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('findOne', () => {
    it('returns user by id', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PATIENT',
        isActive: true,
        settings: {},
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('user-1', 'user-1', 'PATIENT');

      expect(result).toEqual(user);
      // findFirst используется с фильтром deletedAt: null. Mock делегирует
      // на findUnique, поэтому проверяем вызов findFirst.
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'user-1' }),
        }),
      );
    });

    it('throws for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'nonexistent', 'PATIENT'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates user fields', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PATIENT',
        isActive: true,
      };
      const dto = { name: 'Updated Name' };

      // ensureExists calls findUnique
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, ...dto });

      const result = await service.update('user-1', dto, 'user-1', 'PATIENT');

      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: dto,
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PATIENT',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, isActive: false });

      const result = await service.deactivate('user-1');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { isActive: false },
        }),
      );
    });
  });

  describe('getUserSessions', () => {
    it('returns sessions for user', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      const sessions = [
        { id: 's1', userId: 'user-1', sessionNumber: 1 },
        { id: 's2', userId: 'user-1', sessionNumber: 2 },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.count.mockResolvedValue(2);

      const result = await service.getUserSessions(
        'user-1',
        'user-1',
        'PATIENT',
        { page: 1, limit: 20 },
      );

      expect(result.data).toEqual(sessions);
      expect(result.meta.total).toBe(2);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  describe('hardDeleteAllData (#223)', () => {
    it('удаляет subscription/userProgress и отвязывает leads', async () => {
      mockPrisma.session.findMany.mockResolvedValue([{ id: 's1' }]);
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation(
        async (fn: (t: unknown) => Promise<void>) => fn(tx),
      );

      await service.hardDeleteAllData('user-1');

      expect(tx.subscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(tx.userProgress.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(tx.lead.updateMany).toHaveBeenCalledWith({
        where: { convertedUserId: 'user-1' },
        data: { convertedUserId: null },
      });
      expect(tx.lead.updateMany).toHaveBeenCalledWith({
        where: { assignedTherapistId: 'user-1' },
        data: { assignedTherapistId: null },
      });
      // Порядок: user.delete — ПОСЛЕДНИМ (всё остальное вычищено до него)
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });
});
