-- #89 Gamification: UserProgress + UserAchievement

CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProgress_userId_key" ON "UserProgress"("userId");
CREATE INDEX "UserProgress_userId_idx" ON "UserProgress"("userId");
CREATE INDEX "UserProgress_level_idx" ON "UserProgress"("level");

CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress_pct" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAchievement_progressId_achievementKey_key" ON "UserAchievement"("progressId", "achievementKey");
CREATE INDEX "UserAchievement_progressId_idx" ON "UserAchievement"("progressId");

ALTER TABLE "UserAchievement"
  ADD CONSTRAINT "UserAchievement_progressId_fkey" FOREIGN KEY ("progressId")
    REFERENCES "UserProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
