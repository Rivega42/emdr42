import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum BlsPattern {
  horizontal = 'horizontal',
  diagonal = 'diagonal',
  circular = 'circular',
  infinity = 'infinity',
  random = 'random',
}

// Длины из EMDR best practices: targetMemory нередко описательный, остальные — короткие cognition.
const MAX_TARGET_MEMORY = 5000;
const MAX_COGNITION = 500;
const MAX_DOMAIN = 100;
const MAX_BODY_LOCATION = 200;

export class CreateSessionDto {
  @ApiPropertyOptional({ maxLength: MAX_TARGET_MEMORY })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TARGET_MEMORY)
  targetMemory?: string;

  @ApiPropertyOptional({ maxLength: MAX_TARGET_MEMORY })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TARGET_MEMORY)
  targetImage?: string;

  @ApiPropertyOptional({ maxLength: MAX_COGNITION })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_COGNITION)
  negativeCognition?: string;

  @ApiPropertyOptional({ maxLength: MAX_DOMAIN })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DOMAIN)
  ncDomain?: string;

  @ApiPropertyOptional({ maxLength: MAX_COGNITION })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_COGNITION)
  positiveCognition?: string;

  @ApiPropertyOptional({ maxLength: MAX_DOMAIN })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DOMAIN)
  pcDomain?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  initialEmotions?: string[];

  @ApiPropertyOptional({ maxLength: MAX_BODY_LOCATION })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY_LOCATION)
  bodyLocation?: string;

  @ApiPropertyOptional({ enum: BlsPattern, default: BlsPattern.horizontal })
  @IsOptional()
  @IsEnum(BlsPattern)
  blsPattern?: string;

  @ApiPropertyOptional({ default: 1.0, minimum: 0.1, maximum: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  blsSpeed?: number;
}
