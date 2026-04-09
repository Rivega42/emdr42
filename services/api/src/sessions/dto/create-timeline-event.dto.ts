import { IsNumber, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimelineEventDto {
  @ApiProperty({ description: 'Seconds from session start' })
  @IsNumber()
  timestamp!: number;

  @ApiProperty({
    description: 'Event type',
    example: 'phase_start',
  })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Event-specific data' })
  @IsObject()
  data!: Record<string, unknown>;
}
