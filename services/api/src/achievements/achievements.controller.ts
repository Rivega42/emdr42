import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('achievements')
@ApiBearerAuth()
@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user achievements with progress' })
  async getUserAchievements(@CurrentUser() user: { id: string }) {
    return this.achievementsService.getUserAchievements(user.id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check and unlock achievements after session' })
  async checkAchievements(@CurrentUser() user: { id: string }) {
    const unlocked = await this.achievementsService.checkAfterSession(user.id);
    return { unlocked };
  }
}
