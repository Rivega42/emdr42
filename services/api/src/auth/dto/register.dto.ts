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

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
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
