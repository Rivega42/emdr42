import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MfaService } from './mfa.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RefreshTokenService } from '../auth/refresh-token.service';

jest.mock('bcrypt');

const mockPrisma: any = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  verificationToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};
const mockJwt = { sign: jest.fn() };
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockRefresh = {
  issue: jest.fn().mockResolvedValue({
    token: 'r-tok',
    id: 'r1',
    expiresAt: new Date(Date.now() + 86400_000),
  }),
};

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditService, useValue: mockAudit },
        { provide: RefreshTokenService, useValue: mockRefresh },
      ],
    }).compile();
    service = module.get(MfaService);
    jest.clearAllMocks();
  });

  describe('setupTotp', () => {
    it('throws если user не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.setupTotp('nobody')).rejects.toThrow(UnauthorizedException);
    });

    it('throws если MFA уже включён', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        mfaEnabled: true,
      });
      await expect(service.setupTotp('u1')).rejects.toThrow(BadRequestException);
    });

    it('генерирует base32 secret + otpauth URI', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        mfaEnabled: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.setupTotp('u1');
      expect(result.secret).toMatch(/^[A-Z2-7]+$/); // base32 alphabet
      expect(result.otpauthUri).toContain('otpauth://totp/');
      expect(result.otpauthUri).toContain(`secret=${result.secret}`);
      expect(result.otpauthUri).toContain('SHA1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { mfaSecret: result.secret },
      });
    });
  });

  describe('verifyChallenge — TOTP + backup codes', () => {
    const FIXED_SECRET = 'JBSWY3DPEHPK3PXP'; // RFC 6238 reference

    function computeExpectedTotp(secret: string): string {
      // Минимальная реализация для теста (использует те же примитивы)
      const crypto = require('crypto');
      const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const bytes: number[] = [];
      let bits = 0;
      let value = 0;
      for (const ch of secret.replace(/=+$/, '').toUpperCase()) {
        const idx = base32Alphabet.indexOf(ch);
        if (idx < 0) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
          bits -= 8;
          bytes.push((value >>> bits) & 0xff);
        }
      }
      const key = Buffer.from(bytes);
      const counter = Math.floor(Date.now() / 1000 / 30);
      const buf = Buffer.alloc(8);
      buf.writeBigUInt64BE(BigInt(counter));
      const hmac = crypto.createHmac('sha1', key).update(buf).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
      return String(code % 1_000_000).padStart(6, '0');
    }

    it('принимает корректный TOTP код', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        name: 'A',
        role: 'PATIENT',
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });
      mockPrisma.verificationToken.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue('access-jwt');

      const code = computeExpectedTotp(FIXED_SECRET);
      const result = await service.verifyChallenge('u1', code, {
        ip: '1.2.3.4',
      });

      expect(result.accessToken).toBe('access-jwt');
      expect(result.user.id).toBe('u1');
    });

    it('отвергает неверный код (UnauthorizedException)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });
      mockPrisma.verificationToken.findMany.mockResolvedValue([]);

      await expect(service.verifyChallenge('u1', '000000', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('fallback на backup code, помечает usedAt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        name: 'A',
        role: 'PATIENT',
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });
      const backupToken = {
        id: 'vt1',
        userId: 'u1',
        tokenHash: 'hash-1',
        purpose: 'BACKUP_CODE',
        usedAt: null,
      };
      mockPrisma.verificationToken.findMany.mockResolvedValue([backupToken]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.verificationToken.updateMany.mockResolvedValue({ count: 1 });
      mockJwt.sign.mockReturnValue('access-jwt');

      const result = await service.verifyChallenge('u1', 'BACKUPCODE1234', {});
      expect(result.accessToken).toBe('access-jwt');
      // Backup token помечен использованным атомарно (usedAt: null в where)
      expect(mockPrisma.verificationToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'vt1', usedAt: null },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      });
    });

    it('replay backup-кода в окне гонки отклоняется (count=0, #233)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        name: 'A',
        role: 'PATIENT',
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });
      mockPrisma.verificationToken.findMany.mockResolvedValue([
        { id: 'vt1', userId: 'u1', tokenHash: 'hash-1', purpose: 'BACKUP_CODE', usedAt: null },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      // Конкурентный запрос успел пометить код первым
      mockPrisma.verificationToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.verifyChallenge('u1', 'BACKUPCODE1234', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws если MFA не настроен', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        mfaEnabled: false,
        mfaSecret: null,
      });
      await expect(service.verifyChallenge('u1', '000000', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
