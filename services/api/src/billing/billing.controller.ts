import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Список тарифных планов' })
  plans() {
    return this.billing.getPlans();
  }

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Текущая подписка пользователя' })
  mySubscription(@CurrentUser() user: { userId: string }) {
    return this.billing.getSubscription(user.userId);
  }

  @Post('checkout/:planId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Создать Stripe Checkout session' })
  async checkout(
    @CurrentUser() user: { userId: string },
    @Param('planId') planId: string,
  ) {
    return this.billing.createCheckoutSession(user.userId, planId);
  }

  @Post('portal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить URL Stripe customer portal' })
  async portal(@CurrentUser() user: { userId: string }) {
    return this.billing.createPortalSession(user.userId);
  }

  /**
   * Stripe webhook. Требует raw body parsing (НЕ JSON), настраивается отдельно в main.ts.
   * Подробности — инструкции Вике в issue #145.
   */
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    return this.billing.handleWebhook(req.rawBody ?? (req.body as Buffer), signature);
  }
}
