import { Controller, Get, Delete, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/export')
  async exportUserData(@Param('id') id: string) {
    // TODO: Add @CurrentUser() guard to verify user owns this data
    const data = await this.usersService.exportAllData(id);
    return data;
  }

  @Delete(':id/data')
  async deleteAllData(@Param('id') id: string) {
    // TODO: Add @CurrentUser() guard to verify user owns this data
    await this.usersService.deleteAllData(id);
    return { message: 'All session data has been deleted.' };
  }
}
