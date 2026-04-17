import { Module } from '@nestjs/common';
import { CrisisService } from './crisis.service';
import { CrisisController } from './crisis.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CrisisController],
  providers: [CrisisService],
  exports: [CrisisService],
})
export class CrisisModule {}
