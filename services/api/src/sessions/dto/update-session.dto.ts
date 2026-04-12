import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

enum EmdrPhase {
  HISTORY = 'HISTORY',
  PREPARATION = 'PREPARATION',
  ASSESSMENT = 'ASSESSMENT',
  DESENSITIZATION = 'DESENSITIZATION',
  INSTALLATION = 'INSTALLATION',
  BODY_SCAN = 'BODY_SCAN',
  CLOSURE = 'CLOSURE',
  REEVALUATION = 'REEVALUATION',
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ enum: EmdrPhase })
  @IsOptional()
  @IsEnum(EmdrPhase)
  phase?: EmdrPhase;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetMemory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  negativeCognition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positiveCognition?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  sudsBaseline?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  sudsFinal?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  vocBaseline?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  vocFinal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blsPattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  blsSpeed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sessionComplete?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  closureTechnique?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientStateAtEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  betweenSessionNotes?: string;
}
