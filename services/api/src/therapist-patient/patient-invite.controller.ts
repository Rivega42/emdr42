import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle, ThrottleGuard } from '../common/guards/throttle.guard';
import { CreateInviteDto } from './dto/create-invite.dto';
import { PatientInviteService } from './patient-invite.service';

function meta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    correlationId: (req as Request & { correlationId?: string }).correlationId,
  };
}

@ApiTags('patient-invites')
@Controller('therapist-patient/invites')
@UseGuards(ThrottleGuard)
export class PatientInviteController {
  constructor(private readonly invites: PatientInviteService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('THERAPIST', 'ADMIN')
  @Throttle(20, 3600)
  @ApiOperation({ summary: 'Создать invite-ссылку. Plain-token возвращается ОДИН раз.' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInviteDto,
    @Req() req: Request,
  ) {
    return this.invites.create(user.id, dto, meta(req));
  }

  @Get(':token/preview')
  @Throttle(30, 60)
  @ApiOperation({ summary: 'Публичный preview invite (без auth)' })
  preview(@Param('token') token: string) {
    return this.invites.preview(token);
  }

  @Post(':token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(5, 60)
  @ApiOperation({ summary: 'Принять invite (требует auth)' })
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: { id: string; email: string },
    @Req() req: Request,
  ) {
    return this.invites.accept(token, user, meta(req));
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Список моих invite-ссылок' })
  async list(
    @CurrentUser() user: { id: string },
    @Query('status') status?: 'active' | 'used' | 'revoked' | 'expired',
  ) {
    return this.invites.list(user.id, status);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Отозвать invite' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    return this.invites.revoke(id, user.id, meta(req));
  }
}
