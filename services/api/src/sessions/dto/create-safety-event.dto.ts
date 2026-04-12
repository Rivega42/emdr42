import { IsNumber, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum Severity {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

export class CreateSafetyEventDto {
  @ApiProperty({ description: 'Seconds from session start' })
  @IsNumber()
  timestamp!: number;

  @ApiProperty({
    description: 'Safety event type',
    example: 'dissociation',
  })
  @IsString()
  type!: string;

  @ApiProperty({ enum: Severity })
  @IsEnum(Severity)
  severity!: string;

  @ApiProperty({ description: 'Action taken in response' })
  @IsString()
  actionTaken!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
