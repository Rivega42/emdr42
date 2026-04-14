import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  ) {
    return this.usersService.update(user.id, dto, user.id, user.role);
  }

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
    return this.usersService.findOne(id, user.id, user.role);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Get user sessions' })
  async getUserSessions(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.usersService.getUserSessions(id, user.id, user.role, pagination);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export user data (GDPR)' })
  async exportUserData(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (id !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Can only export your own data');
    }
    return this.usersService.exportAllData(id);
  }

  @Delete(':id/data')
  @ApiOperation({ summary: 'Delete all user data (GDPR)' })
  async deleteAllData(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (id !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Can only delete your own data');
    }
    await this.usersService.deleteAllData(id);
    return { message: 'All session data has been deleted.' };
  }
}
