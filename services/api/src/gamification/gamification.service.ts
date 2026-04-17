import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ACHIEVEMENTS, calculateLevel, xpForNextLevel } from './achievements';

/**
 * GamificationService (#89).
 *
 * Управляет XP, levels, streaks и achievements.
 *
 * Event-driven: вызывается из других сервисов при:
 *   - Завершении сессии (SessionsService)
 *   - SUDS=0 / VOC=7 (Orchestrator)
 *   - Email verify (VerificationService)
 *   - Safety events (SafetyMonitor)
 */

export interface ProgressSummary {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  xpToNextLevel: number;
  achievements: Array<{
    key: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }>;
  locked: Array<{ key: string; title: string; description: string; icon: string }>;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Вызывается при событиях — гарантирует наличие UserProgress */
  private async ensureProgress(userId: string) {
    const existing = await (this.prisma as any).userProgress.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return (this.prisma as any).userProgress.create({
      data: { userId },
    });
  }

  async addXp(userId: string, amount: number, reason?: string): Promise<{ xp: number; level: number; leveledUp: boolean }> {
    const progress = await this.ensureProgress(userId);
    const oldLevel = progress.level;
    const newXp = progress.xp + amount;
    const newLevel = calculateLevel(newXp);

    await (this.prisma as any).userProgress.update({
      where: { id: progress.id },
      data: { xp: newXp, level: newLevel, lastActivityAt: new Date() },
    });

    if (reason) {
      this.logger.log(`User ${userId}: +${amount} XP (${reason}) → ${newXp} XP, level ${newLevel}`);
    }

    return { xp: newXp, level: newLevel, leveledUp: newLevel > oldLevel };
  }

  async unlockAchievement(userId: string, key: string): Promise<boolean> {
    const def = ACHIEVEMENTS[key];
    if (!def) {
      this.logger.warn(`Unknown achievement key: ${key}`);
      return false;
    }
    const progress = await this.ensureProgress(userId);

    // idempotent — если уже unlocked, skip
    const existing = await (this.prisma as any).userAchievement.findUnique({
      where: {
        progressId_achievementKey: {
          progressId: progress.id,
          achievementKey: key,
        },
      },
    });
    if (existing) return false;

    await (this.prisma as any).userAchievement.create({
      data: {
        progressId: progress.id,
        achievementKey: key,
        progress_pct: 100,
      },
    });

    // Выдать XP
    await this.addXp(userId, def.xp, `achievement:${key}`);
    return true;
  }

  async bumpStreak(userId: string): Promise<number> {
    const progress = await this.ensureProgress(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActivity = progress.lastActivityAt ? new Date(progress.lastActivityAt) : null;

    let currentStreak = progress.currentStreak;

    if (!lastActivity) {
      currentStreak = 1;
    } else {
      const lastDay = new Date(lastActivity);
      lastDay.setHours(0, 0, 0, 0);
      const diffDays = (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 0) {
        // Уже была активность сегодня — streak не меняется
      } else if (diffDays === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1; // разрыв
      }
    }

    const longestStreak = Math.max(progress.longestStreak, currentStreak);

    await (this.prisma as any).userProgress.update({
      where: { id: progress.id },
      data: { currentStreak, longestStreak, lastActivityAt: today },
    });

    // Streak achievements
    if (currentStreak === 7) await this.unlockAchievement(userId, 'STREAK_7');
    if (currentStreak === 30) await this.unlockAchievement(userId, 'STREAK_30');

    return currentStreak;
  }

  async onSessionCompleted(
    userId: string,
    opts: { finalSuds?: number | null; finalVoc?: number | null; phasesCompleted?: number } = {},
  ) {
    await this.bumpStreak(userId);
    await this.addXp(userId, 20, 'session_completed');

    // Count sessions
    const sessionCount = await this.prisma.session.count({
      where: { userId, status: 'COMPLETED' },
    });
    if (sessionCount === 1) await this.unlockAchievement(userId, 'FIRST_SESSION');
    if (sessionCount === 5) await this.unlockAchievement(userId, 'SESSIONS_5');
    if (sessionCount === 25) await this.unlockAchievement(userId, 'SESSIONS_25');
    if (sessionCount === 100) await this.unlockAchievement(userId, 'SESSIONS_100');

    if (opts.finalSuds === 0) await this.unlockAchievement(userId, 'SUDS_ZERO');
    if (opts.finalVoc === 7) await this.unlockAchievement(userId, 'VOC_SEVEN');
    if (opts.phasesCompleted && opts.phasesCompleted >= 7) {
      await this.unlockAchievement(userId, 'FULL_PROTOCOL');
    }
  }

  async onEmailVerified(userId: string) {
    await this.unlockAchievement(userId, 'EMAIL_VERIFIED');
  }

  async onProfileCompleted(userId: string) {
    await this.unlockAchievement(userId, 'PROFILE_COMPLETE');
  }

  async onStopSignalUsed(userId: string) {
    await this.unlockAchievement(userId, 'SAFETY_FIRST');
  }

  async onCrisisResourcesAccepted(userId: string) {
    await this.unlockAchievement(userId, 'CRISIS_RESOURCES_ACCEPTED');
  }

  async getSummary(userId: string): Promise<ProgressSummary> {
    const progress = await this.ensureProgress(userId);
    const unlocked = await (this.prisma as any).userAchievement.findMany({
      where: { progressId: progress.id },
      orderBy: { unlockedAt: 'desc' },
    });

    const unlockedKeys = new Set(unlocked.map((a: { achievementKey: string }) => a.achievementKey));
    const locked = Object.values(ACHIEVEMENTS)
      .filter((a) => !unlockedKeys.has(a.key))
      .map((a) => ({ key: a.key, title: a.title, description: a.description, icon: a.icon }));

    return {
      xp: progress.xp,
      level: progress.level,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      xpToNextLevel: xpForNextLevel(progress.level) - progress.xp,
      achievements: unlocked.map((a: { achievementKey: string; unlockedAt: Date }) => {
        const def = ACHIEVEMENTS[a.achievementKey];
        return {
          key: a.achievementKey,
          title: def?.title ?? a.achievementKey,
          description: def?.description ?? '',
          icon: def?.icon ?? '🏆',
          unlockedAt: a.unlockedAt.toISOString(),
        };
      }),
      locked,
    };
  }
}
