import { analyzeVoiceSegment } from '../voice-analysis';

describe('analyzeVoiceSegment (#79)', () => {
  it('handles empty segment', () => {
    const r = analyzeVoiceSegment({ words: [], durationSec: 0 });
    expect(r.wpm).toBe(0);
    expect(r.indicators.hesitation).toBe(0);
  });

  it('computes WPM correctly', () => {
    const words = Array.from({ length: 30 }, (_, i) => ({
      word: 'hello',
      start: i * 0.5,
      end: i * 0.5 + 0.3,
    }));
    const r = analyzeVoiceSegment({ words, durationSec: 15 });
    expect(r.wpm).toBe(120); // 30 words / 15 sec * 60 = 120 WPM
  });

  it('detects long pauses as hesitation', () => {
    // Два слова + длинная пауза 4s + два слова
    const words = [
      { word: 'я', start: 0, end: 0.3 },
      { word: 'думаю', start: 0.3, end: 0.7 },
      { word: 'что', start: 4.7, end: 5.0 }, // 4s пауза
      { word: 'это', start: 5.0, end: 5.3 },
    ];
    const r = analyzeVoiceSegment({ words, durationSec: 6 });
    expect(r.pauseCount).toBeGreaterThan(0);
    expect(r.longestPauseSec).toBeGreaterThan(3);
    expect(r.indicators.hesitation).toBeGreaterThan(0.3);
  });

  it('detects filler words', () => {
    const words = [
      { word: 'ну', start: 0, end: 0.3 },
      { word: 'эм', start: 0.4, end: 0.6 },
      { word: 'это', start: 0.7, end: 0.9 },
      { word: 'типа', start: 1.0, end: 1.3 },
      { word: 'сложно', start: 1.4, end: 1.8 },
    ];
    const r = analyzeVoiceSegment({ words, durationSec: 2 });
    expect(r.fillerWordRatio).toBeGreaterThan(0.5);
  });

  it('detects flat affect (low variance + slow speech)', () => {
    const words = Array.from({ length: 10 }, (_, i) => ({
      word: 'слово',
      start: i * 1.2,
      end: i * 1.2 + 0.5,
    }));
    const volumeSamples = Array.from({ length: 20 }, (_, i) => ({
      t: i * 0.5,
      rms: 0.3, // постоянная громкость
    }));
    const r = analyzeVoiceSegment({
      words,
      durationSec: 12,
      volumeSamples,
    });
    expect(r.indicators.flatAffect).toBeGreaterThan(0.3);
  });

  it('detects rushed speech', () => {
    const words = Array.from({ length: 50 }, (_, i) => ({
      word: 'быстро',
      start: i * 0.2,
      end: i * 0.2 + 0.15,
    }));
    const r = analyzeVoiceSegment({ words, durationSec: 10 });
    expect(r.wpm).toBeGreaterThan(200);
    expect(r.indicators.rushedSpeech).toBeGreaterThan(0.5);
  });
});
