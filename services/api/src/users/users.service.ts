import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, requesterId: string, requesterRole: string) {
    if (requesterRole !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    requesterId: string,
    requesterRole: string,
  ) {
    if (requesterRole !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    await this.ensureExists(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async deactivate(id: string) {
    await this.ensureExists(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }

  async getUserSessions(
    id: string,
    requesterId: string,
    requesterRole: string,
    pagination: PaginationDto,
  ) {
    if (requesterRole !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    await this.ensureExists(id);

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.session.count({ where: { userId: id } }),
    ]);

    return {
      data: sessions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
