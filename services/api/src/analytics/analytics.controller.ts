import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { TherapistPatientService } from '../therapist-patient/therapist-patient.service';

const parseDate = (s?: string): Date | undefined =>
  s ? new Date(s) : undefined;

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly tp: TherapistPatientService,
  ) {}

  @Get('me/sessions')
  @ApiOperation({ summary: 'Статистика сессий текущего пациента' })
  async mySessions(
    @CurrentUser() user: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.sessionTrends({
      userId: user.userId,
      from: parseDate(from),
      to: parseDate(to),
    });
  }

  @Get('patients/:patientId/summary')
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Сводка по пациенту (только assigned therapist/admin)' })
  async patientSummary(
    @Param('patientId') patientId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    if (user.role !== 'ADMIN') {
      await this.tp.ensureTherapistCanAccessPatient(user.userId, patientId);
    }
    return this.analytics.patientSummary(patientId);
  }

  @Get('safety-events')
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Safety events trends (admin/therapist)' })
  async safetyEvents(
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.safetyEventsTrend({
      severity,
      from: parseDate(from),
      to: parseDate(to),
    });
  }

  @Get('platform')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Platform-wide stats (admin only)' })
  platformStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.sessionTrends({
      from: parseDate(from),
      to: parseDate(to),
    });
  }
}
