import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TherapistService } from './therapist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('therapist')
@ApiBearerAuth()
@Controller('therapist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('THERAPIST', 'ADMIN')
export class TherapistController {
  constructor(private readonly therapistService: TherapistService) {}

  @Get('patients')
  @ApiOperation({ summary: 'Get list of patients' })
  async getPatients(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.therapistService.getPatients({ page, limit });
  }

  @Get('patients/:id/sessions')
  @ApiOperation({ summary: 'Get patient session history' })
  async getPatientSessions(
    @Param('id') patientId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.therapistService.getPatientSessions(patientId, { page, limit });
  }

  @Get('patients/:id/progress')
  @ApiOperation({ summary: 'Get patient progress (SUDS/VOC trends)' })
  async getPatientProgress(@Param('id') patientId: string) {
    return this.therapistService.getPatientProgress(patientId);
  }

  @Post('sessions/:id/notes')
  @ApiOperation({ summary: 'Add a note to a session' })
  async addNote(
    @Param('id') sessionId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { content: string },
  ) {
    return this.therapistService.addNote(sessionId, user.id, body.content);
  }

  @Get('sessions/:id/notes')
  @ApiOperation({ summary: 'Get notes for a session' })
  async getNotes(@Param('id') sessionId: string) {
    return this.therapistService.getNotes(sessionId);
  }
}
