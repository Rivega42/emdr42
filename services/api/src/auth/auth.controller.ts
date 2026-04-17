import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const extractMeta = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  correlationId: (req as Request & { correlationId?: string }).correlationId,
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const meta = extractMeta(req);
    try {
      const result = await this.authService.register(dto);
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
  @ApiOperation({ summary: 'Login and receive JWT token' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const meta = extractMeta(req);
    try {
      const result = await this.authService.login(dto);
      await this.audit.log({
        userId: (result as any).user?.id,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: (result as any).user?.id,
        success: true,
        ...meta,
        details: { email: dto.email },
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

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() body: { email: string }, @Req() req: Request) {
    await this.authService.forgotPassword(body.email);
    await this.audit.log({
      action: 'PASSWORD_RESET_REQUEST',
      resourceType: 'User',
      success: true,
      ...extractMeta(req),
      details: { email: body.email },
    });
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
    @Req() req: Request,
  ) {
    const meta = extractMeta(req);
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
