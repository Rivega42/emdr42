import { AdaptiveController } from '../adaptive-controller';
import type { EmotionSnapshot, ScaleRecord } from '../types';

const makeEmotion = (overrides: Partial<EmotionSnapshot> = {}): EmotionSnapshot => ({
  timestamp: 0,
  stress: 0.3,
  engagement: 0.7,
  positivity: 0.5,
  arousal: 0.3,
  valence: 0.5,
  joy: 0,
  sadness: 0,
  anger: 0,
  fear: 0,
  confidence: 0.9,
  ...overrides,
});

describe('AdaptiveController adaptive set length (#131)', () => {
  const ctrl = new AdaptiveController();

  it('returns setLength in desensitization range [20..40]', () => {
    const samples = Array.from({ length: 50 }, () =>
      ctrl.calculateBlsParams('desensitization', makeEmotion(), 0, []),
    );
    for (const s of samples) {
      expect(s.setLength).toBeGreaterThanOrEqual(20);
      expect(s.setLength).toBeLessThanOrEqual(40);
    }
  });

  it('returns shorter sets for resource_development phase', () => {
    const samples = Array.from({ length: 20 }, () =>
      ctrl.calculateBlsParams('resource_development', makeEmotion(), 0, []),
    );
    for (const s of samples) {
      expect(s.setLength).toBeGreaterThanOrEqual(8);
      expect(s.setLength).toBeLessThanOrEqual(14);
    }
  });

  it('high SUDS → tends to longer sets', () => {
    const highSuds: ScaleRecord[] = [{ timestamp: 0, value: 9, context: 'baseline' }];
    const lowSuds: ScaleRecord[] = [{ timestamp: 0, value: 1, context: 'baseline' }];

    const highSamples = Array.from({ length: 30 }, () =>
      ctrl.calculateBlsParams('desensitization', makeEmotion(), 0, highSuds).setLength,
    );
    const lowSamples = Array.from({ length: 30 }, () =>
      ctrl.calculateBlsParams('desensitization', makeEmotion(), 0, lowSuds).setLength,
    );

    const avgHigh = highSamples.reduce((a, b) => a + b, 0) / highSamples.length;
    const avgLow = lowSamples.reduce((a, b) => a + b, 0) / lowSamples.length;

    // high SUDS должны в среднем давать длиннее сеты
    expect(avgHigh).toBeGreaterThan(avgLow);
  });

  it('different calls produce variation (jitter)', () => {
    const samples = Array.from({ length: 30 }, () =>
      ctrl.calculateBlsParams(
        'desensitization',
        makeEmotion(),
        0,
        [{ timestamp: 0, value: 5, context: 'x' }],
      ).setLength,
    );
    const unique = new Set(samples).size;
    expect(unique).toBeGreaterThan(3); // не константа
  });
});
