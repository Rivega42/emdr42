import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuditService } from '../audit/audit.service';

const mockRefreshTokens = {
  issue: jest.fn().mockResolvedValue({ token: 'refresh-x', id: 'r1', expiresAt: new Date(Date.now() + 7 * 86400_000) }),
  rotate: jest.fn(),
  revoke: jest.fn().mockResolvedValue(undefined),
  revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  cleanup: jest.fn().mockResolvedValue(undefined),
};

const mockAudit = {
  log: jest.fn().mockResolvedValue(undefined),
};

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    // После #114 auth hardening — login инкрементит failedAttempts,
    // lockUntil. Тесты на login требуют user.update.
    update: jest.fn().mockResolvedValue({ failedAttempts: 1 }),
  },
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockEmailService = {
  sendPasswordReset: jest.fn(),
  sendSessionReminder: jest.fn(),
  sendWeeklyReport: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: RefreshTokenService, useValue: mockRefreshTokens },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates user with hashed password and returns token', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      const hashedPassword = 'hashed_password_123';
      const createdUser = {
        id: 'user-1',
        email: dto.email,
        passwordHash: hashedPassword,
        name: dto.name,
        role: 'PATIENT',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.register(dto);

      // BCRYPT_COST поднят с 10 до 12 (#114 auth hardening)
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          passwordHash: hashedPassword,
          name: dto.name,
          role: undefined,
        },
      });
      expect(result.accessToken).toBe('jwt-token-123');
      expect(result.user.email).toBe(dto.email);
      expect(result.user.id).toBe('user-1');
    });

    it('throws on duplicate email', async () => {
      const dto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: dto.email,
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns token for valid credentials', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 'user-1',
        email: dto.email,
        passwordHash: 'hashed_pw',
        name: 'Test User',
        role: 'PATIENT',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token-456');

      const result = (await service.login(dto)) as {
        accessToken: string;
        user: { id: string; email: string };
      };

      expect(result.accessToken).toBe('jwt-token-456');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe(dto.email);
    });

    it('throws for invalid password', async () => {
      const dto = { email: 'test@example.com', password: 'wrong-password' };
      const user = {
        id: 'user-1',
        email: dto.email,
        passwordHash: 'hashed_pw',
        name: 'Test User',
        role: 'PATIENT',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws for non-existent user', async () => {
      const dto = { email: 'nobody@example.com', password: 'password123' };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateToken', () => {
    it('includes userId and role in JWT payload', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 'user-1',
        email: dto.email,
        passwordHash: 'hashed_pw',
        name: 'Test User',
        role: 'THERAPIST',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      await service.login(dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        role: 'THERAPIST',
      });
    });
  });

  describe('login with MFA', () => {
    it('returns mfaToken + userId without accessToken for MFA-enabled user', async () => {
      const dto = { email: 'mfa@example.com', password: 'password123' };
      const user = {
        id: 'user-mfa',
        email: dto.email,
        passwordHash: 'hashed_pw',
        name: 'MFA User',
        role: 'PATIENT',
        isActive: true,
        mfaEnabled: true, // ключевая разница
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mfa-challenge-jwt');

      const result = (await service.login(dto)) as {
        mfaRequired: true;
        mfaToken: string;
        userId: string;
      };

      expect(result.mfaRequired).toBe(true);
      expect(result.mfaToken).toBe('mfa-challenge-jwt');
      expect(result.userId).toBe('user-mfa');
      expect('accessToken' in result).toBe(false);
      // mfaToken должен быть подписан с purpose=mfa-challenge и TTL 5m
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-mfa', purpose: 'mfa-challenge' },
        { expiresIn: '5m' },
      );
    });
  });

  describe('verifyMfaChallengeToken', () => {
    it('returns userId for valid mfa-challenge token', () => {
      const mockVerify = jest
        .fn()
        .mockReturnValue({ sub: 'user-mfa', purpose: 'mfa-challenge' });
      (service as unknown as { jwtService: JwtService }).jwtService = {
        verify: mockVerify,
        sign: jest.fn(),
      } as unknown as JwtService;

      const result = service.verifyMfaChallengeToken('valid-mfa-token');
      expect(result).toBe('user-mfa');
    });

    it('throws UnauthorizedException for wrong purpose', () => {
      const mockVerify = jest
        .fn()
        .mockReturnValue({ sub: 'user-1', purpose: 'access' });
      (service as unknown as { jwtService: JwtService }).jwtService = {
        verify: mockVerify,
        sign: jest.fn(),
      } as unknown as JwtService;

      expect(() => service.verifyMfaChallengeToken('wrong-purpose')).toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for expired token', () => {
      const mockVerify = jest.fn().mockImplementation(() => {
        throw new Error('jwt expired');
      });
      (service as unknown as { jwtService: JwtService }).jwtService = {
        verify: mockVerify,
        sign: jest.fn(),
      } as unknown as JwtService;

      expect(() => service.verifyMfaChallengeToken('expired')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
