/**
 * Emotion dynamics — структурированное описание эмоционального состояния
 * пациента для LLM-контекста (#241).
 *
 * Раньше в промпт уходили только три скаляра (stress/engagement/valence) —
 * AI не различал «тревожный + бдительный» vs «фрустрированный + утомлённый».
 * Тут мы:
 *   1. Определяем 1-2 доминирующие эмоции из joy/sadness/anger/fear
 *   2. Считаем тренд (recent vs baseline window) — рост/падение по каждой
 *      ключевой метрике с величиной
 *   3. Формируем human-readable интерпретацию + терапевтическую подсказку
 *      (slow tempo, validate, grounding и т.п.)
 */

import type { EmotionSnapshot } from './types';

/** Метрики, по которым считаем тренд. */
const TREND_METRICS = ['stress', 'engagement', 'valence', 'arousal'] as const;
type TrendMetric = (typeof TREND_METRICS)[number];

/** Порог изменения, ниже которого считаем «без изменений». */
const TREND_STABLE_THRESHOLD = 0.08;

/** Базовые эмоции, считаемые «доминирующими» при превышении порога. */
const DOMINANT_THRESHOLD = 0.2;

export type TrendDirection = 'up' | 'down' | 'stable';

export interface EmotionTrend {
  metric: TrendMetric;
  direction: TrendDirection;
  /** Абсолютная разница средних, со знаком (recent - baseline). */
  delta: number;
}

export interface DominantEmotion {
  /** joy / sadness / anger / fear */
  name: string;
  /** Среднее значение в recent-окне, 0..1. */
  value: number;
}

export interface EmotionDynamicsReport {
  /** Топ-1 или топ-2 эмоции по средней интенсивности в recent-окне. */
  dominant: DominantEmotion[];
  trends: EmotionTrend[];
  /** Терапевтическая подсказка для AI («consider grounding» и т.п.). */
  hint: string | null;
  /** true если данных недостаточно — все поля fallback-ные. */
  insufficientData: boolean;
}

const avg = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const direction = (delta: number): TrendDirection => {
  if (delta > TREND_STABLE_THRESHOLD) return 'up';
  if (delta < -TREND_STABLE_THRESHOLD) return 'down';
  return 'stable';
};

const dominantEmotions = (window: EmotionSnapshot[]): DominantEmotion[] => {
  if (window.length === 0) return [];
  const candidates: DominantEmotion[] = [
    { name: 'joy', value: avg(window.map((s) => s.joy)) },
    { name: 'sadness', value: avg(window.map((s) => s.sadness)) },
    { name: 'anger', value: avg(window.map((s) => s.anger)) },
    { name: 'fear', value: avg(window.map((s) => s.fear)) },
  ];
  const sorted = candidates
    .filter((e) => e.value >= DOMINANT_THRESHOLD)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
  return sorted;
};

/**
 * Терапевтическая подсказка для AI (#241). Правила консервативные —
 * приоритет паттернам, требующим замедления темпа или интервенции.
 *
 * Триггеры:
 *  - distress (high stress + dominant fear/sadness + low engagement) → grounding
 *  - rising anger → validate before challenging
 *  - high stress + rising trend → slow tempo
 *  - high engagement + positive trend → good processing window
 */
const buildHint = (
  dominant: DominantEmotion[],
  trends: EmotionTrend[],
  recent: EmotionSnapshot | null,
): string | null => {
  if (!recent) return null;
  const stressTrend = trends.find((t) => t.metric === 'stress');
  const engagementTrend = trends.find((t) => t.metric === 'engagement');
  const dominantName = dominant[0]?.name;
  const stressRising = stressTrend?.direction === 'up';

  // Distress pattern: высокий stress + страх/печаль + падение engagement
  if (
    recent.stress > 0.6 &&
    (dominantName === 'fear' || dominantName === 'sadness') &&
    engagementTrend?.direction === 'down'
  ) {
    return 'rising distress with disengagement — consider grounding (5-4-3-2-1) before continuing';
  }

  if (dominantName === 'anger' && stressRising) {
    return 'rising anger — validate the feeling first, do not challenge the cognition';
  }

  if (recent.stress > 0.75 && stressRising) {
    return 'high stress trending up — slow the BLS tempo and use a shorter set';
  }

  if (
    recent.engagement > 0.7 &&
    (engagementTrend?.direction === 'up' || engagementTrend?.direction === 'stable') &&
    (dominantName === 'joy' || dominantName === undefined)
  ) {
    return 'good processing window — patient is engaged, can deepen the work';
  }

  return null;
};

/**
 * Главный расчёт.
 *
 * @param recent — последние снимки (например, 5 кадров)
 * @param baseline — предыдущее окно для тренда (например, предыдущие 5)
 */
export function computeEmotionDynamics(
  recent: EmotionSnapshot[],
  baseline: EmotionSnapshot[],
): EmotionDynamicsReport {
  if (recent.length === 0) {
    return {
      dominant: [],
      trends: [],
      hint: null,
      insufficientData: true,
    };
  }

  const trends: EmotionTrend[] = TREND_METRICS.map((m) => {
    const recentAvg = avg(recent.map((s) => s[m]));
    const baselineAvg = baseline.length === 0 ? recentAvg : avg(baseline.map((s) => s[m]));
    const delta = recentAvg - baselineAvg;
    return { metric: m, direction: direction(delta), delta };
  });

  const dominant = dominantEmotions(recent);
  const last = recent[recent.length - 1];
  const hint = buildHint(dominant, trends, last);

  return {
    dominant,
    trends,
    hint,
    insufficientData: false,
  };
}

/** Форматирование отчёта для вставки в LLM-контекст (компактные строки). */
export function formatDynamicsForPrompt(report: EmotionDynamicsReport): string[] {
  if (report.insufficientData) return [];
  const lines: string[] = [];

  if (report.dominant.length > 0) {
    const top = report.dominant.map((e) => `${e.name} (${e.value.toFixed(2)})`).join(', ');
    lines.push(`Dominant emotions: ${top}`);
  }

  const arrows: Record<TrendDirection, string> = { up: '↑', down: '↓', stable: '→' };
  const trendStr = report.trends
    .filter((t) => t.direction !== 'stable' || Math.abs(t.delta) > 0.04)
    .map(
      (t) => `${t.metric} ${arrows[t.direction]} ${t.delta >= 0 ? '+' : ''}${t.delta.toFixed(2)}`,
    )
    .join(', ');
  if (trendStr) {
    lines.push(`Trend (recent vs prior): ${trendStr}`);
  }

  if (report.hint) {
    lines.push(`Therapeutic hint: ${report.hint}`);
  }

  return lines;
}
