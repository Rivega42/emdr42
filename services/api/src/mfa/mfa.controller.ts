import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle, ThrottleGuard } from '../common/guards/throttle.guard';
import { AuthService } from '../auth/auth.service';
import { MfaService } from './mfa.service';

class CodeDto {
  @IsString()
  @Length(6, 10)
  code!: string;
}

class ChallengeDto {
  /**
   * Short-lived signed token, выданный login step 1. Заменил raw userId,
   * который позволял атакующему с украденным TOTP проходить за чужого
   * пользователя без знания пароля.
   */
  @IsString()
  mfaToken!: string;

  @IsString()
  @Length(6, 20)
  code!: string;
}

class DisableDto {
  @IsString()
  @MinLength(1)
  password!: string;
}

@ApiTags('mfa')
@Controller('mfa')
@UseGuards(ThrottleGuard)
export class MfaController {
  constructor(
    private readonly service: MfaService,
    private readonly authService: AuthService,
  ) {}

  @Post('setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(5, 3600)
  @ApiOperation({ summary: 'Начать setup TOTP — вернёт secret + otpauth URI' })
  async setup(@CurrentUser() user: { userId: string }) {
    return this.service.setupTotp(user.userId);
  }

  @Post('verify-setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(10, 60)
  @ApiOperation({ summary: 'Подтвердить setup — включает MFA + возвращает backup codes' })
  async verifySetup(
    @CurrentUser() user: { userId: string },
    @Body() dto: CodeDto,
  ) {
    return this.service.verifySetup(user.userId, dto.code);
  }

  @Post('challenge')
  @Throttle(10, 60)
  @ApiOperation({ summary: 'Login step 2 — предоставить TOTP или backup code' })
  async challenge(@Body() dto: ChallengeDto, @Req() req: Request) {
    // Извлекаем userId из подписанного токена step 1, а не из body.
    const userId = this.authService.verifyMfaChallengeToken(dto.mfaToken);
    return this.service.verifyChallenge(userId, dto.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(5, 3600)
  @ApiOperation({ summary: 'Отключить MFA (требует текущий пароль)' })
  async disable(
    @CurrentUser() user: { userId: string },
    @Body() dto: DisableDto,
  ) {
    return this.service.disable(user.userId, dto.password);
  }
}
