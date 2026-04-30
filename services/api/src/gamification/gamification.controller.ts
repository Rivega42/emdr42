import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly service: GamificationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Прогресс: XP, level, streak, achievements' })
  getMySummary(@CurrentUser() user: { userId: string }) {
    return this.service.getSummary(user.userId);
  }

  @Post('events')
  @ApiOperation({ summary: 'Event hook (Orchestrator → XP + achievements)' })
  async event(
    @CurrentUser() user: { userId: string },
    @Body()
    body: {
      type: 'session_completed' | 'stop_signal' | 'crisis_resources';
      finalSuds?: number | null;
      finalVoc?: number | null;
      phasesCompleted?: number;
    },
  ) {
    switch (body.type) {
      case 'session_completed':
        await this.service.onSessionCompleted(user.userId, {
          finalSuds: body.finalSuds,
          finalVoc: body.finalVoc,
          phasesCompleted: body.phasesCompleted,
        });
        break;
      case 'stop_signal':
        await this.service.onStopSignalUsed(user.userId);
        break;
      case 'crisis_resources':
        await this.service.onCrisisResourcesAccepted(user.userId);
        break;
    }
    return { ok: true };
  }
}
