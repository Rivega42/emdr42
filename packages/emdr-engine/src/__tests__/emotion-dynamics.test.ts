import { computeEmotionDynamics, formatDynamicsForPrompt } from '../emotion-dynamics';
import type { EmotionSnapshot } from '../types';

const snap = (over: Partial<EmotionSnapshot> = {}): EmotionSnapshot => ({
  timestamp: Date.now(),
  stress: 0.3,
  engagement: 0.5,
  positivity: 0.5,
  arousal: 0.5,
  valence: 0,
  joy: 0.2,
  sadness: 0.1,
  anger: 0.05,
  fear: 0.1,
  confidence: 0.85,
  ...over,
});

describe('computeEmotionDynamics (#241)', () => {
  it('пустой recent → insufficientData без падений', () => {
    const report = computeEmotionDynamics([], []);
    expect(report.insufficientData).toBe(true);
    expect(report.dominant).toEqual([]);
    expect(report.hint).toBeNull();
  });

  it('доминирующая эмоция — топ-2 по средней интенсивности', () => {
    const recent = Array.from({ length: 5 }, () =>
      snap({ fear: 0.55, sadness: 0.35, anger: 0.05, joy: 0.1 }),
    );
    const report = computeEmotionDynamics(recent, []);

    expect(report.dominant[0].name).toBe('fear');
    expect(report.dominant[0].value).toBeCloseTo(0.55, 2);
    expect(report.dominant[1].name).toBe('sadness');
  });

  it('игнорирует эмоции ниже порога 0.2', () => {
    const recent = Array.from({ length: 5 }, () =>
      snap({ joy: 0.05, sadness: 0.05, anger: 0.05, fear: 0.05 }),
    );
    const report = computeEmotionDynamics(recent, []);
    expect(report.dominant).toHaveLength(0);
  });

  it('тренд: stress ↑ если recent выше baseline', () => {
    const baseline = Array.from({ length: 5 }, () => snap({ stress: 0.3 }));
    const recent = Array.from({ length: 5 }, () => snap({ stress: 0.7 }));
    const report = computeEmotionDynamics(recent, baseline);

    const stressTrend = report.trends.find((t) => t.metric === 'stress');
    expect(stressTrend?.direction).toBe('up');
    expect(stressTrend?.delta).toBeCloseTo(0.4, 2);
  });

  it('тренд: stable если разница меньше порога 0.08', () => {
    const baseline = Array.from({ length: 5 }, () => snap({ stress: 0.5 }));
    const recent = Array.from({ length: 5 }, () => snap({ stress: 0.55 }));
    const report = computeEmotionDynamics(recent, baseline);
    expect(report.trends.find((t) => t.metric === 'stress')?.direction).toBe('stable');
  });

  it('подсказка: distress pattern (страх + падение engagement)', () => {
    const baseline = Array.from({ length: 5 }, () => snap({ stress: 0.4, engagement: 0.7 }));
    const recent = Array.from({ length: 5 }, () =>
      snap({ stress: 0.75, engagement: 0.3, fear: 0.6 }),
    );
    const report = computeEmotionDynamics(recent, baseline);
    expect(report.hint).toMatch(/distress.+grounding/i);
  });

  it('подсказка: rising anger → validate', () => {
    const baseline = Array.from({ length: 5 }, () => snap({ stress: 0.3, anger: 0.1 }));
    const recent = Array.from({ length: 5 }, () => snap({ stress: 0.6, anger: 0.55 }));
    const report = computeEmotionDynamics(recent, baseline);
    expect(report.hint).toMatch(/anger.+validate/i);
  });

  it('подсказка: высокий stress + рост → замедлить BLS', () => {
    const baseline = Array.from({ length: 5 }, () => snap({ stress: 0.55 }));
    const recent = Array.from({ length: 5 }, () =>
      snap({ stress: 0.85, joy: 0.05, sadness: 0.05, fear: 0.05 }),
    );
    const report = computeEmotionDynamics(recent, baseline);
    expect(report.hint).toMatch(/high stress.+slow.+BLS/i);
  });

  it('подсказка: хорошее окно для обработки', () => {
    const baseline = Array.from({ length: 5 }, () => snap({ engagement: 0.6, joy: 0.3 }));
    const recent = Array.from({ length: 5 }, () =>
      snap({ engagement: 0.85, joy: 0.5, stress: 0.2 }),
    );
    const report = computeEmotionDynamics(recent, baseline);
    expect(report.hint).toMatch(/good processing window/i);
  });

  it('нет подсказки для нейтрального состояния', () => {
    const recent = Array.from({ length: 5 }, () =>
      snap({ stress: 0.3, engagement: 0.5, joy: 0.1, sadness: 0.1 }),
    );
    const report = computeEmotionDynamics(recent, recent);
    expect(report.hint).toBeNull();
  });
});

describe('formatDynamicsForPrompt (#241)', () => {
  it('пустой отчёт → пустой массив', () => {
    expect(
      formatDynamicsForPrompt({
        dominant: [],
        trends: [],
        hint: null,
        insufficientData: true,
      }),
    ).toEqual([]);
  });

  it('форматирует доминирующие эмоции + тренды со стрелками + подсказку', () => {
    const recent = Array.from({ length: 5 }, () =>
      snap({ stress: 0.8, engagement: 0.3, fear: 0.6 }),
    );
    const baseline = Array.from({ length: 5 }, () =>
      snap({ stress: 0.3, engagement: 0.7, fear: 0.1 }),
    );
    const lines = formatDynamicsForPrompt(computeEmotionDynamics(recent, baseline));
    const joined = lines.join('\n');

    expect(joined).toMatch(/Dominant emotions: fear/);
    expect(joined).toMatch(/stress ↑/);
    expect(joined).toMatch(/engagement ↓/);
    expect(joined).toMatch(/Therapeutic hint:/);
  });

  it('скрывает тренды близкие к нулю', () => {
    const recent = Array.from({ length: 5 }, () => snap({ stress: 0.5 }));
    const lines = formatDynamicsForPrompt(computeEmotionDynamics(recent, recent));
    const trendLine = lines.find((l) => l.startsWith('Trend'));
    expect(trendLine).toBeUndefined();
  });
});
