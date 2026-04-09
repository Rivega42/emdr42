import { IsNumber, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVocRecordDto {
  @ApiProperty({ description: 'Seconds from session start' })
  @IsNumber()
  timestamp!: number;

  @ApiProperty({ description: 'VOC value 1-7', minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  value!: number;

  @ApiProperty({
    description: 'Context of measurement',
    example: 'baseline',
  })
  @IsString()
  context!: string;
}
