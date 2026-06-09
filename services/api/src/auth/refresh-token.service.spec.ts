import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(RefreshTokenService);
    jest.clearAllMocks();
  });

  describe('issue', () => {
    it('creates a hashed token + returns plaintext + expiresAt', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'r1' });
      const result = await service.issue('user-1', { ip: '1.2.3.4' });

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(40);
      expect(result.id).toBe('r1');
      expect(result.expiresAt).toBeInstanceOf(Date);
      // Должен хранить только хеш, не plaintext
      const callData = mockPrisma.refreshToken.create.mock.calls[0][0].data;
      expect(callData.tokenHash).not.toBe(result.token);
      expect(callData.tokenHash.length).toBe(64); // sha256 hex
    });
  });

  describe('rotate — atomic race protection', () => {
    const futureDate = new Date(Date.now() + 86400_000);
    const issuedAt = new Date(Date.now() - 60_000);

    it('успешно поворачивает действующий токен (count === 1)', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'old-1',
        userId: 'user-1',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: issuedAt,
      });
      // updateMany возвращает count===1 → захватили токен первыми
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'new-1' });

      const result = await service.rotate('plain-token', {});
      expect(result.userId).toBe('user-1');
      expect(result.newToken.id).toBe('new-1');
      // Атомарная защита через WHERE revokedAt: null
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
        }),
      );
    });

    it('CRITICAL — concurrent refresh: detect token theft (count === 0)', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'old-1',
        userId: 'user-1',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: issuedAt,
      });
      // updateMany count===0 → другой воркер успел захватить или replay
      mockPrisma.refreshToken.updateMany
        .mockResolvedValueOnce({ count: 0 }) // первая попытка ротации провалена
        .mockResolvedValueOnce({ count: 5 }); // revokeAllForUser

      await expect(service.rotate('replay-token', {})).rejects.toThrow(
        UnauthorizedException,
      );

      // Должны отозвать ВСЕ active токены пользователя (theft detection)
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenNthCalledWith(2, {
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });

    it('rejects expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'old-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000), // expired
        revokedAt: null,
        createdAt: issuedAt,
      });
      await expect(service.rotate('expired', {})).rejects.toThrow(
        /expired/i,
      );
    });

    it('rejects unknown token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.rotate('unknown', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revoke / revokeAllForUser', () => {
    it('revokes single token by plaintext', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      await service.revoke('plain');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
        }),
      );
    });

    it('revokes all tokens for user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });
      await service.revokeAllForUser('user-1');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });
});
