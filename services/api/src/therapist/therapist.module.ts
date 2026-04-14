import { Module } from '@nestjs/common';
import { TherapistController } from './therapist.controller';
import { TherapistService } from './therapist.service';

@Module({
  controllers: [TherapistController],
  providers: [TherapistService],
  exports: [TherapistService],
})
export class TherapistModule {}
