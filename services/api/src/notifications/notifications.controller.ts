import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IsString, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

class PushKeysDto {
  @IsString() @IsNotEmpty() p256dh!: string;
  @IsString() @IsNotEmpty() auth!: string;
}

class SubscribeDto {
  @IsString() @IsNotEmpty() endpoint!: string;
  @ValidateNested() @Type(() => PushKeysDto) keys!: PushKeysDto;
}

class UnsubscribeDto {
  @IsString() @IsNotEmpty() endpoint!: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Публичный VAPID-ключ нужен фронту для PushManager.subscribe().
  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Публичный VAPID-ключ для Web Push' })
  vapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Сохранить Web Push подписку браузера' })
  async subscribe(
    @CurrentUser() user: { id: string },
    @Body() dto: SubscribeDto,
    @Req() req: Request,
  ) {
    await this.notifications.subscribe(user.id, dto, req.headers['user-agent']);
    return { success: true };
  }

  @Delete('subscribe')
  @ApiOperation({ summary: 'Удалить Web Push подписку' })
  async unsubscribe(@CurrentUser() user: { id: string }, @Body() dto: UnsubscribeDto) {
    return this.notifications.unsubscribe(user.id, dto.endpoint);
  }
}
