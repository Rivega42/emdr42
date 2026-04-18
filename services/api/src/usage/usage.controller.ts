import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsageService } from './usage.service';

@ApiTags('usage')
@ApiBearerAuth()
@Controller('usage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Post('record')
  @ApiOperation({ summary: 'Record usage event (called from Orchestrator)' })
  async record(
    @CurrentUser() user: { userId: string },
    @Body()
    body: {
      sessionId?: string;
      provider: string;
      providerType: 'LLM' | 'TTS' | 'STT';
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
      durationMs?: number;
    },
  ) {
    await this.usage.record({ ...body, userId: user.userId });
    return { recorded: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Cost summary за последние N дней для текущего пользователя' })
  getMyCosts(
    @CurrentUser() user: { userId: string },
    @Query('days') days?: string,
  ) {
    return this.usage.getUserCosts(user.userId, days ? Number(days) : 30);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Session cost breakdown' })
  getSessionCost(@Param('sessionId') sessionId: string) {
    return this.usage.getSessionCost(sessionId);
  }

  @Get('users/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: cost summary для любого пользователя' })
  getUserCosts(
    @Param('id') userId: string,
    @Query('days') days?: string,
  ) {
    return this.usage.getUserCosts(userId, days ? Number(days) : 30);
  }
}
