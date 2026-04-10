import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  session: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  safetyEvent: {
    count: jest.fn(),
  },
  platformSettings: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('returns correct counts and averages', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.session.count.mockResolvedValue(500);
      mockPrisma.session.findMany.mockResolvedValue([
        { sudsBaseline: 8, sudsFinal: 3 },
        { sudsBaseline: 7, sudsFinal: 2 },
        { sudsBaseline: 9, sudsFinal: 4 },
      ]);
      mockPrisma.safetyEvent.count.mockResolvedValue(5);

      const result = await service.getMetrics();

      expect(result.usersCount).toBe(100);
      expect(result.sessionsCount).toBe(500);
      expect(result.unresolvedSafetyAlerts).toBe(5);
      // avg reduction: (5 + 5 + 5) / 3 = 5.0
      expect(result.avgSudsReduction).toBe(5);
    });
  });

  describe('getSettings', () => {
    it('returns all settings', async () => {
      const settings = [
        { key: 'max_session_duration', value: 90, category: 'session' },
        { key: 'enable_safety', value: true, category: 'safety' },
      ];

      mockPrisma.platformSettings.findMany.mockResolvedValue(settings);

      const result = await service.getSettings();

      expect(result).toEqual(settings);
      expect(mockPrisma.platformSettings.findMany).toHaveBeenCalledWith({
        orderBy: { category: 'asc' },
      });
    });
  });

  describe('updateSetting', () => {
    it('updates existing setting', async () => {
      const existing = { key: 'max_sessions', value: 10, category: 'session' };
      const updatedSetting = { ...existing, value: 20 };

      mockPrisma.platformSettings.findUnique.mockResolvedValue(existing);
      mockPrisma.platformSettings.update.mockResolvedValue(updatedSetting);

      const result = await service.updateSetting('max_sessions', {
        value: 20,
      });

      expect(result.value).toBe(20);
      expect(mockPrisma.platformSettings.update).toHaveBeenCalledWith({
        where: { key: 'max_sessions' },
        data: { value: 20 },
      });
    });

    it('throws NotFoundException if setting does not exist', async () => {
      mockPrisma.platformSettings.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSetting('nonexistent_key', { value: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEnhancedUsers', () => {
    it('returns users with session stats', async () => {
      const users = [
        {
          id: 'u1',
          email: 'a@test.com',
          name: 'User A',
          role: 'PATIENT',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          _count: { sessions: 5 },
          sessions: [{ sudsBaseline: 8, sudsFinal: 3 }],
        },
        {
          id: 'u2',
          email: 'b@test.com',
          name: 'User B',
          role: 'PATIENT',
          isActive: true,
          createdAt: new Date('2024-02-01'),
          _count: { sessions: 0 },
          sessions: [],
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.getEnhancedUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].totalSessions).toBe(5);
      expect(result.data[0].lastSudsReduction).toBe(5); // 8 - 3
      expect(result.data[1].totalSessions).toBe(0);
      expect(result.data[1].lastSudsReduction).toBeNull();
      expect(result.meta.total).toBe(2);
    });
  });
});
