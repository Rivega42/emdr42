/**
 * Emotion peak detection (#240).
 *
 * Сейчас «эмоциональные моменты» сессии выявляются только через
 * SafetyMonitor → SafetyEvent (диссоциация, абреакция, выход из window-of-
 * tolerance, stress > 0.9). Это критические события, но не «самые
 * эмоциональные».
 *
 * Для пост-сессионного разбора (и кабинета терапевта #90) важны ВСЕ
 * локальные максимумы трека — даже подпороговые: первое озвучивание
 * воспоминания, рост engagement в installation-фазе, точка перехода
 * SUDS 6→3, и т.п.
 *
 * Алгоритм: поиск локальных максимумов с минимальной prominence и
 * минимальным расстоянием между пиками. По мотивам scipy.signal.find_peaks.
 */

import type { EmotionSnapshot } from './types';

/** Метрики, по которым ищем пики (в EmotionSnapshot). */
const PEAK_METRICS = ['stress', 'arousal', 'engagement'] as const;
type PeakMetric = (typeof PEAK_METRICS)[number];

export interface EmotionPeak {
  metric: PeakMetric;
  /** Индекс в исходном треке. */
  index: number;
  /** timestamp снимка-пика (мс, как в EmotionSnapshot). */
  timestamp: number;
  /** Значение метрики на пике, 0..1. */
  value: number;
  /**
   * Prominence — на сколько пик выше окружающего минимума с обеих сторон.
   * Используется для ранжирования: чем выше, тем «острее» момент.
   */
  prominence: number;
}

export interface PeakDetectionOptions {
  /** Минимальное значение метрики для рассмотрения. Default: 0.5. */
  minHeight?: number;
  /**
   * Минимальная prominence (превышение над окружающими минимумами).
   * Спасает от шума на «плато». Default: 0.08.
   */
  minProminence?: number;
  /**
   * Минимальное расстояние между пиками (в индексах). Не выдаём
   * соседние пики — берём самый высокий из группы. Default: 30.
   */
  minDistance?: number;
  /** Топ-N пиков на каждую метрику (по prominence). Default: без ограничения. */
  topN?: number;
}

/**
 * Поиск локальных максимумов одной метрики.
 * Кандидат i — пик, если `track[i] > track[i-1]` и `track[i] > track[i+1]`
 * (или равенство на «плато» с подъёмом до — спускающимся после).
 */
function findLocalMaxima(values: number[]): number[] {
  const peaks: number[] = [];
  if (values.length < 3) return peaks;

  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    const next = values[i + 1];
    // Строгий максимум
    if (cur > prev && cur > next) {
      peaks.push(i);
      continue;
    }
    // Плато: поднимаемся, потом находим спуск
    if (cur > prev && cur === next) {
      let j = i + 1;
      while (j < values.length - 1 && values[j] === cur) j++;
      if (values[j] < cur) {
        peaks.push(i);
      }
      i = j; // перепрыгиваем плато
    }
  }
  return peaks;
}

/**
 * Prominence пика: высота от его вершины до самого высокого окружающего
 * минимума (left base + right base, берём более высокий минимум).
 */
function prominenceAt(values: number[], peakIdx: number): number {
  const peakValue = values[peakIdx];
  let leftMin = peakValue;
  for (let i = peakIdx - 1; i >= 0; i--) {
    if (values[i] > peakValue) break;
    if (values[i] < leftMin) leftMin = values[i];
  }
  let rightMin = peakValue;
  for (let i = peakIdx + 1; i < values.length; i++) {
    if (values[i] > peakValue) break;
    if (values[i] < rightMin) rightMin = values[i];
  }
  return peakValue - Math.max(leftMin, rightMin);
}

/**
 * Прореживание: если два пика ближе minDistance — оставляем тот, что
 * с большей prominence.
 */
function dedupeNearbyPeaks(peaks: EmotionPeak[], minDistance: number): EmotionPeak[] {
  if (peaks.length === 0) return peaks;
  const sorted = [...peaks].sort((a, b) => a.index - b.index);
  const kept: EmotionPeak[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = kept[kept.length - 1];
    if (sorted[i].index - last.index < minDistance) {
      if (sorted[i].prominence > last.prominence) {
        kept[kept.length - 1] = sorted[i];
      }
    } else {
      kept.push(sorted[i]);
    }
  }
  return kept;
}

/**
 * Поиск пиков по одной метрике.
 */
function findPeaksForMetric(
  track: EmotionSnapshot[],
  metric: PeakMetric,
  opts: Required<Pick<PeakDetectionOptions, 'minHeight' | 'minProminence' | 'minDistance'>>,
): EmotionPeak[] {
  const values = track.map((s) => s[metric]);
  const localMaxIdx = findLocalMaxima(values);

  const candidates: EmotionPeak[] = localMaxIdx
    .filter((i) => values[i] >= opts.minHeight)
    .map((i) => ({
      metric,
      index: i,
      timestamp: track[i].timestamp,
      value: values[i],
      prominence: prominenceAt(values, i),
    }))
    .filter((p) => p.prominence >= opts.minProminence);

  return dedupeNearbyPeaks(candidates, opts.minDistance);
}

/**
 * Главная функция: ищет пики по `stress`, `arousal`, `engagement` в треке.
 * Возвращает объединённый список, отсортированный по timestamp.
 *
 * @param topN — если задан, оставляет топ-N по prominence на КАЖДУЮ метрику
 *   (чтобы один разгоряченный stress не вытеснил все engagement-пики).
 */
export function findEmotionPeaks(
  track: EmotionSnapshot[],
  options: PeakDetectionOptions = {},
): EmotionPeak[] {
  const opts = {
    minHeight: options.minHeight ?? 0.5,
    minProminence: options.minProminence ?? 0.08,
    minDistance: options.minDistance ?? 30,
  };

  const all: EmotionPeak[] = [];
  for (const metric of PEAK_METRICS) {
    let peaks = findPeaksForMetric(track, metric, opts);
    if (options.topN !== undefined) {
      peaks = [...peaks].sort((a, b) => b.prominence - a.prominence).slice(0, options.topN);
    }
    all.push(...peaks);
  }

  return all.sort((a, b) => a.timestamp - b.timestamp);
}
