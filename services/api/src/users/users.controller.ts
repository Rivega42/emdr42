import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { UsersService, type AuditMeta } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const extractMeta = (req: Request): AuditMeta => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  correlationId: (req as Request & { correlationId?: string }).correlationId,
});

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: { id: string; role: string }) {
    return this.usersService.findOne(user.id, user.id, user.role);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.update(user.id, dto, user.id, user.role, extractMeta(req));
  }

  @Get('me/export')
  @ApiOperation({ summary: 'GDPR Art. 15 — экспорт своих данных' })
  async exportMe(
    @CurrentUser() user: { id: string; role: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const data = await this.usersService.exportAllData(user.id, extractMeta(req));
    res
      .setHeader('Content-Type', 'application/json')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="emdr42-export-${user.id}-${Date.now()}.json"`,
      )
      .send(JSON.stringify(data, null, 2));
  }

  @Delete('me')
  @ApiOperation({ summary: 'GDPR Art. 17 — запросить удаление данных (30 дней grace period)' })
  async requestDeletionMe(
    @CurrentUser() user: { id: string; role: string },
    @Req() req: Request,
  ) {
    return this.usersService.requestDeletion(user.id, extractMeta(req));
  }

  @Post('me/cancel-deletion')
  @ApiOperation({ summary: 'Отменить запрос удаления (в grace period)' })
  async cancelDeletionMe(
    @CurrentUser() user: { id: string; role: string },
    @Req() req: Request,
  ) {
    return this.usersService.cancelDeletion(user.id, user.id, extractMeta(req));
  }

  // --- Admin endpoints ---

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all users (admin only)' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (id !== user.id && user.role !== 'ADMIN' && user.role !== 'THERAPIST') {
      throw new ForbiddenException('Cannot view another user');
    }
    return this.usersService.findOne(id, user.id, user.role);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Get user sessions' })
  async getUserSessions(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Query() pagination: PaginationDto,
  ) {
    if (id !== user.id && user.role !== 'ADMIN' && user.role !== 'THERAPIST') {
      throw new ForbiddenException('Cannot view another user sessions');
    }
    return this.usersService.getUserSessions(id, user.id, user.role, pagination);
  }

  @Get(':id/export')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: экспорт данных произвольного пользователя' })
  async exportUserData(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.usersService.exportAllData(id, extractMeta(req));
  }

  @Delete(':id/data')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: hard delete данных произвольного пользователя' })
  async deleteAllData(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const meta = extractMeta(req);
    await this.usersService.hardDeleteAllData(id);
    return { message: 'All data has been permanently deleted.', meta };
  }
}
