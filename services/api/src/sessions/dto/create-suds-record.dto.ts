import { IsNumber, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSudsRecordDto {
  @ApiProperty({ description: 'Seconds from session start' })
  @IsNumber()
  timestamp!: number;

  @ApiProperty({ description: 'SUDS value 0-10', minimum: 0, maximum: 10 })
  @IsInt()
  @Min(0)
  @Max(10)
  value!: number;

  @ApiProperty({
    description: 'Context of measurement',
    example: 'baseline',
  })
  @IsString()
  context!: string;
}
