import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
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

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
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

      const result = await service.login(dto);

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
});
