import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PatientContextService } from './patient-context.service';
import { TherapistPatientService } from '../therapist-patient/therapist-patient.service';

@ApiTags('patient-context')
@ApiBearerAuth()
@Controller('patient-context')
@UseGuards(JwtAuthGuard)
export class PatientContextController {
  constructor(
    private readonly service: PatientContextService,
    private readonly tp: TherapistPatientService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Cross-session контекст текущего пациента' })
  getMy(@CurrentUser() user: { userId: string }) {
    return this.service.getContext(user.userId);
  }

  @Get('me/prompt')
  @ApiOperation({ summary: 'Formatted context для AI system prompt' })
  async getMyPrompt(@CurrentUser() user: { userId: string }) {
    const ctx = await this.service.getContext(user.userId);
    return { prompt: this.service.formatForSystemPrompt(ctx) };
  }

  @Get('patients/:patientId')
  @ApiOperation({ summary: 'Context пациента (только для assigned therapist/admin)' })
  async getByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    if (user.role !== 'ADMIN') {
      if (user.userId === patientId) {
        // owner access
      } else {
        await this.tp.ensureTherapistCanAccessPatient(user.userId, patientId);
      }
    }
    return this.service.getContext(patientId);
  }
}
