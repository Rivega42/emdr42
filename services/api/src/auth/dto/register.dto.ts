import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum Role {
  PATIENT = 'PATIENT',
  THERAPIST = 'THERAPIST',
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ng!Passw0rd' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.PATIENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.PATIENT;
}
