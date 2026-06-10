import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  // Опционален (#115): refresh может прийти HttpOnly cookie `refresh_token`
  // вместо body. Контроллер берёт body ?? cookie.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(16)
  refreshToken?: string;
}
