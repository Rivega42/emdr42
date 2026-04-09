import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmotionRecordDto {
  @ApiProperty({ description: 'Seconds from session start' })
  @IsNumber()
  timestamp!: number;

  @ApiProperty() @IsNumber() @Min(0) @Max(1) stress!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(1) engagement!: number;
  @ApiProperty() @IsNumber() @Min(-1) @Max(1) positivity!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(1) arousal!: number;
  @ApiProperty() @IsNumber() @Min(-1) @Max(1) valence!: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) joy?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) sadness?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) anger?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) fear?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) surprise?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) disgust?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) confidence?: number;
}
