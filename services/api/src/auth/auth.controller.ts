import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { Throttle, ThrottleGuard } from '../common/guards/throttle.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

const extractMeta = (req: Request) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

const extractAuditMeta = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  correlationId: (req as Request & { correlationId?: string }).correlationId,
});

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottleGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Post('register')
  @Throttle(5, 3600)
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const meta = extractAuditMeta(req);
    try {
      const result = await this.authService.register(dto, extractMeta(req));
      await this.audit.log({
        userId: (result as any).user?.id,
        action: 'REGISTER',
        resourceType: 'User',
        resourceId: (result as any).user?.id,
        success: true,
        ...meta,
        details: { email: dto.email },
      });
      return result;
    } catch (err) {
      await this.audit.log({
        action: 'REGISTER',
        resourceType: 'User',
        success: false,
        ...meta,
        details: { email: dto.email, error: String(err) },
      });
      throw err;
    }
  }

  @Post('login')
  @Throttle(10, 60)
  @ApiOperation({ summary: 'Login (возвращает access+refresh пару)' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const meta = extractAuditMeta(req);
    try {
      const result = await this.authService.login(dto, extractMeta(req));
      await this.audit.log({
        userId: (result as any).user?.id,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: (result as any).user?.id,
        success: true,
        ...meta,
        details: { email: dto.email, mfaRequired: (result as any).mfaRequired ?? false },
      });
      return result;
    } catch (err) {
      await this.audit.log({
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        success: false,
        ...meta,
        details: { email: dto.email },
      });
      throw err;
    }
  }

  @Post('refresh')
  @Throttle(60, 60)
  @ApiOperation({ summary: 'Rotate refresh token → выдать новую пару' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const meta = extractAuditMeta(req);
    try {
      const result = await this.authService.refresh(
        dto.refreshToken,
        extractMeta(req),
      );
      await this.audit.log({
        userId: (result as any).user?.id,
        action: 'TOKEN_REFRESH',
        resourceType: 'RefreshToken',
        success: true,
        ...meta,
      });
      return result;
    } catch (err) {
      await this.audit.log({
        action: 'TOKEN_REFRESH_FAILED',
        resourceType: 'RefreshToken',
        success: false,
        ...meta,
        details: { error: String(err) },
      });
      throw err;
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Отозвать refresh token' })
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    await this.authService.logout(dto.refreshToken);
    await this.audit.log({
      action: 'LOGOUT',
      resourceType: 'RefreshToken',
      success: true,
      ...extractAuditMeta(req),
    });
    return { success: true };
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отозвать все refresh tokens пользователя' })
  async logoutAll(
    @CurrentUser() user: { userId: string },
    @Req() req: Request,
  ) {
    await this.authService.logoutAll(user.userId);
    await this.audit.log({
      userId: user.userId,
      actorId: user.userId,
      action: 'LOGOUT_ALL',
      resourceType: 'RefreshToken',
      success: true,
      ...extractAuditMeta(req),
    });
    return { success: true };
  }

  @Post('forgot-password')
  @Throttle(3, 3600)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() body: { email: string }, @Req() req: Request) {
    await this.authService.forgotPassword(body.email);
    await this.audit.log({
      action: 'PASSWORD_RESET_REQUEST',
      resourceType: 'User',
      success: true,
      ...extractAuditMeta(req),
      details: { email: body.email },
    });
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  @Post('reset-password')
  @Throttle(5, 3600)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
    @Req() req: Request,
  ) {
    const meta = extractAuditMeta(req);
    try {
      await this.authService.resetPassword(body.token, body.newPassword);
      await this.audit.log({
        action: 'PASSWORD_RESET_COMPLETE',
        resourceType: 'User',
        success: true,
        ...meta,
      });
      return { message: 'Password has been reset successfully.' };
    } catch (err) {
      await this.audit.log({
        action: 'PASSWORD_RESET_FAILED',
        resourceType: 'User',
        success: false,
        ...meta,
      });
      throw err;
    }
  }
}
