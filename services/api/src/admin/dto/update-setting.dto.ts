import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Setting value (any JSON)' })
  @IsNotEmpty()
  value!: any;
}
