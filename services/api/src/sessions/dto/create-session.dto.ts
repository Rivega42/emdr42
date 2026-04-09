import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum BlsPattern {
  horizontal = 'horizontal',
  diagonal = 'diagonal',
  circular = 'circular',
  infinity = 'infinity',
  random = 'random',
}

export class CreateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetMemory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  negativeCognition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ncDomain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positiveCognition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pcDomain?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  initialEmotions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
