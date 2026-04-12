import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { PaginationDto } from '../users/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const [
      usersCount,
      sessionsCount,
      completedSessions,
      safetyAlerts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.session.count(),
      this.prisma.session.findMany({
        where: {
          status: 'COMPLETED',
          sudsBaseline: { not: null },
          sudsFinal: { not: null },
        },
        select: { sudsBaseline: true, sudsFinal: true },
      }),
      this.prisma.safetyEvent.count({
        where: { resolved: false },
      }),
    ]);

    const sudsReductions = completedSessions
      .filter((s) => s.sudsBaseline != null && s.sudsFinal != null)
      .map((s) => (s.sudsBaseline as number) - (s.sudsFinal as number));

    const avgSudsReduction = sudsReductions.length
      ? Math.round(
          (sudsReductions.reduce((a, b) => a + b, 0) / sudsReductions.length) *
            100,
        ) / 100
      : null;

    return {
      usersCount,
      sessionsCount,
      avgSudsReduction,
      unresolvedSafetyAlerts: safetyAlerts,
    };
  }

  async getSettings() {
    return this.prisma.platformSettings.findMany({
      orderBy: { category: 'asc' },
    });
  }

  async updateSetting(key: string, dto: UpdateSettingDto) {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }

    return this.prisma.platformSettings.update({
      where: { key },
      data: { value: dto.value },
    });
  }

  async getEnhancedUsers(pagination: PaginationDto) {
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
          _count: {
            select: { sessions: true },
          },
          sessions: {
            where: { status: 'COMPLETED' },
            select: { sudsBaseline: true, sudsFinal: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    const data = users.map((user) => {
      const lastSession = user.sessions[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        totalSessions: user._count.sessions,
        lastSudsReduction:
          lastSession?.sudsBaseline != null && lastSession?.sudsFinal != null
            ? lastSession.sudsBaseline - lastSession.sudsFinal
            : null,
      };
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
