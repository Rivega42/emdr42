import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RetentionScheduler } from './retention.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TherapistPatientModule } from '../therapist-patient/therapist-patient.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule, TherapistPatientModule],
  controllers: [UsersController],
  providers: [UsersService, RetentionScheduler],
  exports: [UsersService],
})
export class UsersModule {}
