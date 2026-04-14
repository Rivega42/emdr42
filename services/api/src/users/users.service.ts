import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
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
          settings: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUserId: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
    role: string,
  ) {
    // Verify user exists
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Only the user themselves or an ADMIN can update
    if (id !== currentUserId && role !== 'ADMIN') {
      throw new ForbiddenException('Cannot update another user');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserSessions(
    userId: string,
    currentUserId: string,
    role: string,
    pagination: PaginationDto,
  ) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.session.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportAllData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          include: {
            timelineEvents: true,
            emotionRecords: true,
            sudsRecords: true,
            vocRecords: true,
            safetyEvents: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Strip sensitive fields
    const { passwordHash, resetToken, resetTokenExpiry, ...safeUser } = user;

    return {
      user: safeUser,
      exportedAt: new Date().toISOString(),
    };
  }

  async deleteAllData(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Get all session IDs for cascading delete
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s: { id: string }) => s.id);

    if (sessionIds.length > 0) {
      // Delete all related records in correct order
      await this.prisma.safetyEvent.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await this.prisma.emotionRecord.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await this.prisma.sudsRecord.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await this.prisma.vocRecord.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await this.prisma.timelineEvent.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await this.prisma.session.deleteMany({ where: { userId } });
    }
  }
}
