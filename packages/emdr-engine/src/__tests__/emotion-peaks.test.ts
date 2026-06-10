import { findEmotionPeaks } from '../emotion-peaks';
import type { EmotionSnapshot } from '../types';

const snap = (over: Partial<EmotionSnapshot> = {}, ts = Date.now()): EmotionSnapshot => ({
  timestamp: ts,
  stress: 0.3,
  engagement: 0.5,
  positivity: 0.5,
  arousal: 0.5,
  valence: 0,
  joy: 0.1,
  sadness: 0.1,
  anger: 0.05,
  fear: 0.1,
  confidence: 0.85,
  ...over,
});

/** Утилита: трек с заданными значениями stress, timestamp = i * 1000 (1 кадр/сек). */
const trackOf = (stressValues: number[]): EmotionSnapshot[] =>
  stressValues.map((s, i) => snap({ stress: s }, i * 1000));

describe('findEmotionPeaks (#240)', () => {
  it('пустой трек или слишком короткий — нет пиков', () => {
    expect(findEmotionPeaks([])).toEqual([]);
    expect(findEmotionPeaks(trackOf([0.5, 0.6]))).toEqual([]);
  });

  it('один чёткий пик в центре', () => {
    // 0.3 .. 0.7 (пик) .. 0.3 — prominence 0.4
    const track = trackOf([0.3, 0.5, 0.7, 0.5, 0.3]);
    const peaks = findEmotionPeaks(track, { minDistance: 1 });
    const stressPeaks = peaks.filter((p) => p.metric === 'stress');
    expect(stressPeaks).toHaveLength(1);
    expect(stressPeaks[0].index).toBe(2);
    expect(stressPeaks[0].value).toBe(0.7);
    expect(stressPeaks[0].prominence).toBeCloseTo(0.4, 2);
  });

  it('игнорирует пик ниже minHeight', () => {
    const track = trackOf([0.1, 0.2, 0.3, 0.2, 0.1]); // пик 0.3 < 0.5
    const peaks = findEmotionPeaks(track, { minHeight: 0.5, minDistance: 1 });
    expect(peaks.filter((p) => p.metric === 'stress')).toEqual([]);
  });

  it('игнорирует пик с маленькой prominence (шум на плато)', () => {
    // Плавный рост с шумом: prominence маленькая
    const track = trackOf([0.5, 0.55, 0.6, 0.62, 0.61, 0.62, 0.6]);
    const peaks = findEmotionPeaks(track, { minProminence: 0.2, minDistance: 1 });
    expect(peaks.filter((p) => p.metric === 'stress')).toEqual([]);
  });

  it('два пика — оба возвращаются, если расстояние больше minDistance', () => {
    // Пики на индексах 2 и 7
    const track = trackOf([0.3, 0.5, 0.8, 0.5, 0.3, 0.4, 0.5, 0.75, 0.5, 0.3]);
    const peaks = findEmotionPeaks(track, { minDistance: 3 });
    const stressPeaks = peaks.filter((p) => p.metric === 'stress');
    expect(stressPeaks).toHaveLength(2);
    expect(stressPeaks.map((p) => p.index)).toEqual([2, 7]);
  });

  it('два близких пика — оставляет тот, у кого выше prominence', () => {
    // Пики на 2 (prominence ~0.5) и на 4 (prominence ~0.2). minDistance=5.
    const track = trackOf([0.2, 0.5, 0.7, 0.6, 0.65, 0.4, 0.3]);
    const peaks = findEmotionPeaks(track, { minDistance: 5, minProminence: 0.05 });
    const stressPeaks = peaks.filter((p) => p.metric === 'stress');
    expect(stressPeaks).toHaveLength(1);
    expect(stressPeaks[0].index).toBe(2); // более «острый» пик
  });

  it('возвращает результат отсортированным по timestamp', () => {
    const track: EmotionSnapshot[] = [
      snap({ stress: 0.3 }, 1000),
      snap({ stress: 0.8 }, 2000),
      snap({ stress: 0.3 }, 3000),
      snap({ engagement: 0.5 }, 4000),
      snap({ engagement: 0.85 }, 5000),
      snap({ engagement: 0.5 }, 6000),
    ];
    const peaks = findEmotionPeaks(track, { minDistance: 1 });
    expect(peaks.map((p) => p.timestamp)).toEqual([2000, 5000]);
  });

  it('топ-N ограничивает количество пиков на метрику (по prominence)', () => {
    // Три пика. Выигрывает не самый ВЫСОКИЙ (0.95), а самый ОСТРЫЙ —
    // с большей prominence (значение vs окружающий минимум). Это важно
    // клинически: разница 0.2→0.7 показательнее, чем 0.6→0.7.
    const track = trackOf([
      0.6,
      0.65,
      0.7,
      0.65,
      0.6, // пик 0.7, prominence 0.1
      0.6,
      0.7,
      0.95,
      0.7,
      0.6, // пик 0.95, prominence ~0.35
      0.2,
      0.5,
      0.85,
      0.5,
      0.2, // пик 0.85, prominence ~0.65 — победитель
    ]);
    const peaks = findEmotionPeaks(track, { topN: 1, minDistance: 3 });
    const stressPeaks = peaks.filter((p) => p.metric === 'stress');
    expect(stressPeaks).toHaveLength(1);
    expect(stressPeaks[0].value).toBe(0.85);
  });

  it('ищет пики независимо по stress, arousal, engagement', () => {
    const track: EmotionSnapshot[] = [
      snap({ stress: 0.3, arousal: 0.3, engagement: 0.3 }, 1000),
      snap({ stress: 0.8, arousal: 0.4, engagement: 0.4 }, 2000),
      snap({ stress: 0.3, arousal: 0.3, engagement: 0.3 }, 3000),
      snap({ stress: 0.3, arousal: 0.9, engagement: 0.3 }, 4000),
      snap({ stress: 0.3, arousal: 0.3, engagement: 0.3 }, 5000),
      snap({ stress: 0.3, arousal: 0.3, engagement: 0.85 }, 6000),
      snap({ stress: 0.3, arousal: 0.3, engagement: 0.3 }, 7000),
    ];
    const peaks = findEmotionPeaks(track, { minDistance: 1 });
    const metrics = peaks.map((p) => p.metric).sort();
    expect(metrics).toEqual(['arousal', 'engagement', 'stress']);
  });

  it('монотонная функция (рост или спад) — пиков нет', () => {
    const ascending = trackOf([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
    const descending = trackOf([0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]);
    expect(findEmotionPeaks(ascending)).toEqual([]);
    expect(findEmotionPeaks(descending)).toEqual([]);
  });

  it('константа — пиков нет', () => {
    const track = trackOf(Array(20).fill(0.5));
    expect(findEmotionPeaks(track)).toEqual([]);
  });
});
