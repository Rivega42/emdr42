import { Module } from '@nestjs/common';
import { TherapistPatientController } from './therapist-patient.controller';
import { TherapistPatientService } from './therapist-patient.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [TherapistPatientController],
  providers: [TherapistPatientService],
  exports: [TherapistPatientService],
})
export class TherapistPatientModule {}
