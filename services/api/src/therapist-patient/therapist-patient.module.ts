import { Module } from '@nestjs/common';
import { TherapistPatientController } from './therapist-patient.controller';
import { TherapistPatientService } from './therapist-patient.service';
import { PatientInviteController } from './patient-invite.controller';
import { PatientInviteService } from './patient-invite.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [TherapistPatientController, PatientInviteController],
  providers: [TherapistPatientService, PatientInviteService],
  exports: [TherapistPatientService, PatientInviteService],
})
export class TherapistPatientModule {}
