import { Module } from '@nestjs/common';
import { PatientContextService } from './patient-context.service';
import { PatientContextController } from './patient-context.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TherapistPatientModule } from '../therapist-patient/therapist-patient.module';

@Module({
  imports: [PrismaModule, TherapistPatientModule],
  controllers: [PatientContextController],
  providers: [PatientContextService],
  exports: [PatientContextService],
})
export class PatientContextModule {}
