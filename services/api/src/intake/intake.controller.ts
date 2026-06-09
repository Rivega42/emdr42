import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { CreateLeadDto, UpdateLeadDto } from './dto/create-lead.dto';
import { IntakeService } from './intake.service';

function metaFrom(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

@ApiTags('intake')
@Controller('intake')
@UseGuards(ThrottleGuard)
export class IntakeController {
  constructor(private readonly intake: IntakeService) {}

  // Публичный submit с маркетинг-сайта.
  @Post('leads')
  @Throttle(5, 3600)
  @ApiOperation({ summary: 'Submit lead с маркетинг-сайта (no auth)' })
  async submit(@Body() dto: CreateLeadDto, @Req() req: Request) {
    return this.intake.submit(dto, metaFrom(req));
  }

  @Get('leads')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'THERAPIST')
  @ApiOperation({ summary: 'Список лидов (фильтры: status, assignedTherapistId)' })
  async list(
    @Query('status') status?: string,
    @Query('assignedTherapistId') assignedTherapistId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.intake.list({
      status,
      assignedTherapistId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch('leads/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'THERAPIST')
  @ApiOperation({ summary: 'Изменить status/assigned/notes лида' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateLeadDto,
    @Req() req: Request,
  ) {
    return this.intake.update(id, user.id, dto, metaFrom(req));
  }

  @Post('leads/:id/convert')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'THERAPIST')
  @ApiOperation({ summary: 'Convert lead → invite-ссылка для assigned therapist' })
  async convert(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    return this.intake.convert(id, user.id, metaFrom(req));
  }
}
