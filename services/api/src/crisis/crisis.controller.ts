import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CrisisService, type CrisisSeverity, type CrisisType } from './crisis.service';

class RecordCrisisDto {
  @IsEnum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'])
  severity!: CrisisSeverity;

  @IsEnum(['SUICIDE_IDEATION', 'SELF_HARM', 'DISSOCIATION', 'PANIC', 'OTHER'])
  type!: CrisisType;

  @IsOptional() @IsUUID()
  sessionId?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  triggerText?: string;
}

@ApiTags('crisis')
@ApiBearerAuth()
@Controller('crisis')
@UseGuards(JwtAuthGuard)
export class CrisisController {
  constructor(private readonly service: CrisisService) {}

  @Get('hotlines')
  @ApiOperation({ summary: 'Hotlines для страны текущего пользователя' })
  hotlines(@CurrentUser() user: { userId: string }) {
    return this.service.getHotlinesForUser(user.userId);
  }

  @Get('hotlines/:countryCode')
  @ApiOperation({ summary: 'Hotlines для произвольной страны (ISO-3166 alpha-2)' })
  hotlinesByCountry(@Param('countryCode') code: string) {
    // Reuse через core helper
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getHotlinesForCountry } = require('@emdr42/core');
    return getHotlinesForCountry(code);
  }

  @Post('report')
  @ApiOperation({ summary: 'Зафиксировать crisis event' })
  report(
    @CurrentUser() user: { userId: string },
    @Body() dto: RecordCrisisDto,
    @Req() req: Request,
  ) {
    return this.service.record({
      userId: user.userId,
      sessionId: dto.sessionId,
      severity: dto.severity,
      type: dto.type,
      triggerText: dto.triggerText,
      correlationId: (req as Request & { correlationId?: string }).correlationId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('acknowledge/:id')
  @ApiOperation({ summary: 'Пользователь acknowledge crisis event' })
  acknowledge(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.service.acknowledge(id, user.userId);
  }

  @Get('events')
  @ApiOperation({ summary: 'История crisis events текущего пользователя' })
  list(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
  ) {
    return this.service.listForUser(user.userId, limit ? Number(limit) : 50);
  }
}
