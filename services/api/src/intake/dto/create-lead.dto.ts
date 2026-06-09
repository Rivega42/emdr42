import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLeadDto {
  @ApiProperty() @IsEmail() @MaxLength(255) email!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(64) source?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsObject() utm?: Record<string, string>;
  @ApiProperty({ required: false, enum: ['email', 'phone', 'telegram', 'whatsapp'] })
  @IsOptional()
  @IsIn(['email', 'phone', 'telegram', 'whatsapp'])
  preferredContactChannel?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) preferredTime?: string;
  @ApiProperty({ required: false, minLength: 1, maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message?: string;
  @ApiProperty({ description: 'Согласие на обработку ПДн' })
  @IsBoolean()
  consent!: boolean;
  /** Honeypot: если непусто — silent 200 без записи. */
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) _hp?: string;
}

export class UpdateLeadDto {
  @ApiProperty({ required: false, enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'BOOKED', 'CONVERTED', 'REJECTED', 'SPAM'] })
  @IsOptional()
  @IsIn(['NEW', 'CONTACTED', 'QUALIFIED', 'BOOKED', 'CONVERTED', 'REJECTED', 'SPAM'])
  status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() assignedTherapistId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) message?: string;
}
