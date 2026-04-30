/**
 * Achievement catalog (#89).
 *
 * Ключ — stable ID. Остальное — метаданные для UI.
 */

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  category: 'onboarding' | 'consistency' | 'milestone' | 'safety' | 'mastery';
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  FIRST_SESSION: {
    key: 'FIRST_SESSION',
    title: 'Первый шаг',
    description: 'Завершили первую EMDR-сессию',
    icon: '🌱',
    xp: 50,
    category: 'onboarding',
  },
  SESSIONS_5: {
    key: 'SESSIONS_5',
    title: 'Регулярность',
    description: 'Завершили 5 сессий',
    icon: '🔥',
    xp: 100,
    category: 'consistency',
  },
  SESSIONS_25: {
    key: 'SESSIONS_25',
    title: 'Привычка',
    description: 'Завершили 25 сессий',
    icon: '⭐',
    xp: 250,
    category: 'consistency',
  },
  SESSIONS_100: {
    key: 'SESSIONS_100',
    title: 'Путь героя',
    description: 'Завершили 100 сессий',
    icon: '👑',
    xp: 1000,
    category: 'consistency',
  },

  STREAK_7: {
    key: 'STREAK_7',
    title: 'Неделя силы',
    description: 'Выполнили упражнения 7 дней подряд',
    icon: '📅',
    xp: 150,
    category: 'consistency',
  },
  STREAK_30: {
    key: 'STREAK_30',
    title: 'Месяц постоянства',
    description: 'Выполнили упражнения 30 дней подряд',
    icon: '🗓️',
    xp: 500,
    category: 'consistency',
  },

  SUDS_ZERO: {
    key: 'SUDS_ZERO',
    title: 'Тишина внутри',
    description: 'Достигли SUDS=0 в сессии',
    icon: '🕊️',
    xp: 200,
    category: 'milestone',
  },
  VOC_SEVEN: {
    key: 'VOC_SEVEN',
    title: 'Полное согласие',
    description: 'Достигли VOC=7 в фазе Installation',
    icon: '✨',
    xp: 200,
    category: 'milestone',
  },
  FULL_PROTOCOL: {
    key: 'FULL_PROTOCOL',
    title: 'Полный протокол',
    description: 'Прошли все 8 фаз EMDR в одной сессии',
    icon: '🎯',
    xp: 300,
    category: 'mastery',
  },

  SAFETY_FIRST: {
    key: 'SAFETY_FIRST',
    title: 'Безопасность прежде всего',
    description: 'Использовали stop-signal когда это было нужно',
    icon: '🛡️',
    xp: 100,
    category: 'safety',
  },
  CRISIS_RESOURCES_ACCEPTED: {
    key: 'CRISIS_RESOURCES_ACCEPTED',
    title: 'Путь к поддержке',
    description: 'Обратились к crisis hotline через приложение',
    icon: '🤝',
    xp: 100,
    category: 'safety',
  },

  EMAIL_VERIFIED: {
    key: 'EMAIL_VERIFIED',
    title: 'Верифицирован',
    description: 'Подтвердили email',
    icon: '✉️',
    xp: 25,
    category: 'onboarding',
  },
  PROFILE_COMPLETE: {
    key: 'PROFILE_COMPLETE',
    title: 'Готов к работе',
    description: 'Заполнили профиль (emergency contact, страна)',
    icon: '📋',
    xp: 30,
    category: 'onboarding',
  },
};

/**
 * XP → Level formula:
 *   Level 1: 0 XP
 *   Level 2: 100 XP
 *   Level N: (N-1)^2 * 100 XP
 */
export const calculateLevel = (xp: number): number => {
  if (xp < 100) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const xpForNextLevel = (currentLevel: number): number => {
  return currentLevel * currentLevel * 100;
};
