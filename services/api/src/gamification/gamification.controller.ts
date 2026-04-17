import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
