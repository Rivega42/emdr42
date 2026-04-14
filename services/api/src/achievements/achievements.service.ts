import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const XP_PER_LEVEL = 100;

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all achievements with user progress. */
  async getUserAchievements(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      include: {
        users: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return achievements.map((ach: any) => {
      const userAch = ach.users[0];
      return {
        id: ach.id,
        type: ach.type,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        xpReward: ach.xpReward,
        progress: userAch?.progress ?? 0,
        completed: userAch?.completed ?? false,
        unlockedAt: userAch?.unlockedAt ?? null,
      };
    });
  }

  /** Check and unlock achievements after a session completes. */
  async checkAfterSession(userId: string): Promise<string[]> {
    const unlocked: string[] = [];

    const [sessionCount, user] = await Promise.all([
      this.prisma.session.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, xp: true, level: true },
      }),
    ]);

    if (!user) return [];

    // first_session
    if (sessionCount >= 1) {
      const u = await this.tryUnlock(userId, 'first_session', 1);
      if (u) unlocked.push(u);
    }

    // 3_sessions
    if (sessionCount >= 3) {
      const u = await this.tryUnlock(userId, '3_sessions', 1);
      if (u) unlocked.push(u);
    }

    // 10_sessions
    if (sessionCount >= 10) {
      const u = await this.tryUnlock(userId, '10_sessions', 1);
      if (u) unlocked.push(u);
    }

    // Check SUDS drop 50%
    const lastSession = await this.prisma.session.findFirst({
      where: { userId, status: 'COMPLETED', sudsBaseline: { not: null }, sudsFinal: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (lastSession?.sudsBaseline && lastSession?.sudsFinal) {
      const drop = (lastSession.sudsBaseline - lastSession.sudsFinal) / lastSession.sudsBaseline;
      if (drop >= 0.5) {
        const u = await this.tryUnlock(userId, 'suds_drop_50', 1);
        if (u) unlocked.push(u);
      }
    }

    // Check VOC max
    if (lastSession) {
      const vocMax = await this.prisma.vocRecord.findFirst({
        where: { sessionId: lastSession.id, value: 7 },
      });
      if (vocMax) {
        const u = await this.tryUnlock(userId, 'voc_max', 1);
        if (u) unlocked.push(u);
      }
    }

    // Award XP for session completion
    let xpGain = 10;
    for (const name of unlocked) {
      const ach = await this.prisma.achievement.findUnique({ where: { type: name } });
      if (ach) xpGain += ach.xpReward;
    }

    const newXp = (user.xp || 0) + xpGain;
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel },
    });

    return unlocked;
  }

  /** Try to unlock an achievement. Returns achievement type if newly unlocked, null otherwise. */
  private async tryUnlock(userId: string, type: string, progress: number): Promise<string | null> {
    const achievement = await this.prisma.achievement.findUnique({ where: { type } });
    if (!achievement) return null;

    const existing = await this.prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    });

    if (existing?.completed) return null;

    await this.prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      create: {
        userId,
        achievementId: achievement.id,
        progress,
        completed: progress >= 1,
        unlockedAt: progress >= 1 ? new Date() : null,
      },
      update: {
        progress,
        completed: progress >= 1,
        unlockedAt: progress >= 1 ? new Date() : undefined,
      },
    });

    return progress >= 1 ? type : null;
  }
}
