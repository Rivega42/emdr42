import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InternalServiceGuard } from '../auth/guards/internal-service.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsageService } from './usage.service';

@ApiTags('usage')
@ApiBearerAuth()
@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  /**
   * Internal endpoint — вызывается только Orchestrator с x-internal-key.
   * Пациентский браузер сюда попадать НЕ должен (иначе можно произвольно
   * накручивать usage/cost).
   */
  @Post('record')
  @UseGuards(InternalServiceGuard)
  @ApiOperation({ summary: 'Record usage event (called from Orchestrator)' })
  async record(
    @Body()
    body: {
      userId: string;
      sessionId?: string;
      provider: string;
      providerType: 'LLM' | 'TTS' | 'STT';
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
      durationMs?: number;
    },
  ) {
    if (!body.userId) {
      // Orchestrator должен явно передавать userId — без подмены из токена.
      throw new Error('userId is required for internal usage record');
    }
    await this.usage.record(body);
    return { recorded: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cost summary за последние N дней для текущего пользователя' })
  getMyCosts(
    @CurrentUser() user: { userId: string },
    @Query('days') days?: string,
  ) {
    return this.usage.getUserCosts(user.userId, days ? Number(days) : 30);
  }

  @Get('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Session cost breakdown — только владелец сессии или ADMIN' })
  async getSessionCost(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    // Защита от IDOR — без неё любой авторизованный мог посмотреть стоимость
    // чужой сессии.
    await this.usage.ensureSessionAccess(sessionId, user.userId, user.role);
    return this.usage.getSessionCost(sessionId);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: cost summary для любого пользователя' })
  getUserCosts(
    @Param('id') userId: string,
    @Query('days') days?: string,
  ) {
    return this.usage.getUserCosts(userId, days ? Number(days) : 30);
  }
}
