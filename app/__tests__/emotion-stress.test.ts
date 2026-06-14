/**
 * Регрессия на формулу stress в EmotionRecognitionService.processExpressions.
 * Баг (ревью механик): `Math.min(1, sum) / 3` зажимал stress в [0, 0.333],
 * из-за чего пороги stress>0.75/0.8/0.85 (адаптация BLS + safety-алерты)
 * были недостижимы. Фикс — деление внутри Math.min: `Math.min(1, sum/3)`.
 */
import EmotionRecognitionService from '@emdr42/core/services/emotion-recognition';

const ZERO = {
  neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0,
};

function stressOf(expr: Partial<Record<string, number>>): number {
  const svc = new EmotionRecognitionService();
  // processExpressions приватный, но детерминирован по expressions (stress не EMA-сглажен)
  const data = (svc as unknown as {
    processExpressions: (e: Record<string, number>, s: number) => { behavioral: { stress: number } };
  }).processExpressions({ ...ZERO, ...expr }, 0.9);
  return data.behavioral.stress;
}

describe('EmotionRecognitionService — формула stress', () => {
  it('сильный негатив даёт высокий stress (НЕ зажат в 0.333)', () => {
    const s = stressOf({ fearful: 0.9, angry: 0.8 });
    // 0.9*1.2 + 0.8 = 1.88; /3 = 0.626 — раньше было бы min(1,1.88)/3 = 0.333
    expect(s).toBeGreaterThan(0.6);
    expect(s).toBeGreaterThan(1 / 3); // явная регрессия на старый кламп
  });

  it('экстремальный негатив клампится в 1', () => {
    const s = stressOf({ fearful: 1, angry: 1, sad: 1, disgusted: 1 });
    expect(s).toBe(1);
  });

  it('пороги адаптации/алертов достижимы (>0.75 и >0.85)', () => {
    // (1.2 + 1 + 0.4)/3 = 0.867 — раньше потолок был 0.333, порог недостижим
    expect(stressOf({ fearful: 1, angry: 1, sad: 0.5 })).toBeGreaterThan(0.75);
    expect(stressOf({ fearful: 1, angry: 1, sad: 1 })).toBeGreaterThan(0.85);
  });

  it('нейтральное лицо — stress около нуля', () => {
    expect(stressOf({ neutral: 1 })).toBeLessThan(0.05);
  });

  it('stress монотонно растёт с негативом', () => {
    expect(stressOf({ angry: 0.3 })).toBeLessThan(stressOf({ angry: 0.9 }));
  });
});
