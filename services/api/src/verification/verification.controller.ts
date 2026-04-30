import {
  Body,
  Controller,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle, ThrottleGuard } from '../common/guards/throttle.guard';
import { VerificationService } from './verification.service';

class PhoneDto {
  @IsPhoneNumber()
  phone!: string;
}

class CodeDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

@ApiTags('verification')
@Controller('verification')
@UseGuards(ThrottleGuard)
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @Post('email/send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(3, 600) // 3 письма в 10 минут
  @ApiOperation({ summary: 'Отправить email verification для текущего пользователя' })
  async sendEmail(@CurrentUser() user: { userId: string }) {
    await this.service.sendEmailVerification(user.userId);
    return { sent: true };
  }

  @Post('email/verify')
  @Throttle(10, 60)
  @ApiOperation({ summary: 'Подтвердить email по токену' })
  async verifyEmail(@Query('token') token: string) {
    return this.service.verifyEmail(token);
  }

  @Post('phone/send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(3, 300) // 3 SMS в 5 минут
  @ApiOperation({ summary: 'Отправить SMS-код на телефон' })
  async sendPhone(@CurrentUser() user: { userId: string }, @Body() dto: PhoneDto) {
    await this.service.sendPhoneCode(user.userId, dto.phone);
    return { sent: true };
  }

  @Post('phone/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(10, 60)
  @ApiOperation({ summary: 'Подтвердить телефон 6-значным кодом' })
  async verifyPhone(
    @CurrentUser() user: { userId: string },
    @Body() dto: CodeDto,
  ) {
    await this.service.verifyPhone(user.userId, dto.code);
    return { verified: true };
  }
}
