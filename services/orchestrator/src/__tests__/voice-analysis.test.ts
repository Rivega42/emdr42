/**
 * Spec для voice-analysis (#79) — анализ речевых паттернов:
 * WPM, паузы, filler words, volume variance, композитные клинические
 * индикаторы (hesitation, emotionalActivation, flatAffect, rushedSpeech).
 */
import { analyzeVoiceSegment, type VoiceSegment, type WordTiming } from '../voice-analysis';

const w = (word: string, start: number, end: number): WordTiming => ({ word, start, end });

const buildSegment = (words: WordTiming[], duration: number): VoiceSegment => ({
  words,
  durationSec: duration,
});

describe('analyzeVoiceSegment (#79)', () => {
  describe('edge cases', () => {
    it('пустой массив слов → нулевая аналитика', () => {
      const result = analyzeVoiceSegment({ words: [], durationSec: 10 });
      expect(result.wpm).toBe(0);
      expect(result.pauseRatio).toBe(0);
      expect(result.indicators).toEqual({
        hesitation: 0,
        emotionalActivation: 0,
        flatAffect: 0,
        rushedSpeech: 0,
      });
    });

    it('durationSec <= 0 → нулевая аналитика', () => {
      const result = analyzeVoiceSegment({ words: [w('hi', 0, 1)], durationSec: 0 });
      expect(result.wpm).toBe(0);
    });
  });

  describe('WPM (words per minute)', () => {
    it('100 слов за 60 секунд → 100 WPM (baseline)', () => {
      const words = Array.from({ length: 100 }, (_, i) => w('word', i * 0.5, i * 0.5 + 0.4));
      expect(analyzeVoiceSegment(buildSegment(words, 60)).wpm).toBe(100);
    });

    it('очень быстрая речь (>150 WPM) → rushedSpeech > 0', () => {
      const words = Array.from({ length: 30 }, (_, i) => w('word', i * 0.3, i * 0.3 + 0.2));
      const r = analyzeVoiceSegment(buildSegment(words, 10)); // 30 слов / 10с = 180 WPM
      expect(r.wpm).toBeGreaterThan(150);
      expect(r.indicators.rushedSpeech).toBeGreaterThan(0);
    });

    it('медленная речь (<100 WPM) → rushedSpeech=0', () => {
      const words = Array.from({ length: 10 }, (_, i) => w('word', i * 1.0, i * 1.0 + 0.3));
      const r = analyzeVoiceSegment(buildSegment(words, 60));
      expect(r.indicators.rushedSpeech).toBe(0);
    });
  });

  describe('паузы', () => {
    it('пауза >= 0.8с регистрируется', () => {
      const words = [w('first', 0, 0.5), w('second', 2.0, 2.5)]; // gap = 1.5s
      const r = analyzeVoiceSegment(buildSegment(words, 5));
      expect(r.pauseCount).toBe(1);
      expect(r.longestPauseSec).toBeCloseTo(1.5, 2);
    });

    it('паузы < 0.8с НЕ считаются (естественные интервалы между словами)', () => {
      const words = [w('a', 0, 0.5), w('b', 0.7, 1.0), w('c', 1.2, 1.5)];
      const r = analyzeVoiceSegment(buildSegment(words, 5));
      expect(r.pauseCount).toBe(0);
      expect(r.pauseRatio).toBe(0);
    });

    it('длинная пауза > 3с → бонус к hesitation (диссоциация-индикатор)', () => {
      const shortPause = [w('a', 0, 1), w('b', 1.5, 2)]; // pause = 0.5s — нет
      const longPause = [w('a', 0, 1), w('b', 5, 5.5)]; // pause = 4s — long

      const rNoLong = analyzeVoiceSegment(buildSegment(shortPause, 10));
      const rWithLong = analyzeVoiceSegment(buildSegment(longPause, 10));
      expect(rWithLong.indicators.hesitation).toBeGreaterThan(rNoLong.indicators.hesitation);
    });

    it('pauseRatio ограничен 1.0 (durationSec может быть короче суммы пауз)', () => {
      const words = [w('a', 0, 0.1), w('b', 10, 10.1)]; // pause ~10s в окне 5с
      const r = analyzeVoiceSegment(buildSegment(words, 5));
      expect(r.pauseRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('filler words', () => {
    it('русские filler-слова считаются (case-insensitive, без пунктуации)', () => {
      const words = [w('Эм,', 0, 0.5), w('ну', 0.6, 0.8), w('я', 0.9, 1.0), w('думаю', 1.1, 1.5)];
      const r = analyzeVoiceSegment(buildSegment(words, 2));
      expect(r.fillerWordRatio).toBe(0.5); // 2 из 4
    });

    it('английские filler-слова считаются', () => {
      const words = [w('um', 0, 0.3), w('I', 0.4, 0.5), w('like', 0.6, 0.8), w('think', 0.9, 1.2)];
      const r = analyzeVoiceSegment(buildSegment(words, 2));
      expect(r.fillerWordRatio).toBe(0.5); // um + like = 2 из 4
    });

    it('обычные слова не считаются как filler', () => {
      const words = [w('сегодня', 0, 0.5), w('хорошая', 0.6, 1.0), w('погода', 1.1, 1.5)];
      expect(analyzeVoiceSegment(buildSegment(words, 2)).fillerWordRatio).toBe(0);
    });

    it('высокий filler ratio + паузы → высокий hesitation', () => {
      const words = [
        w('эм', 0, 0.5),
        w('эмм', 0.6, 1.0),
        w('ну', 5.0, 5.3), // пауза
        w('вот', 5.4, 5.8),
      ];
      const r = analyzeVoiceSegment(buildSegment(words, 7));
      expect(r.indicators.hesitation).toBeGreaterThan(0.5);
    });
  });

  describe('volume variance', () => {
    it('равномерная громкость → variance ≈ 0 → бонус к flatAffect', () => {
      const words = [w('a', 0, 0.5), w('b', 0.6, 1.0), w('c', 1.1, 1.5)];
      const samples = Array.from({ length: 20 }, (_, i) => ({ t: i * 0.1, rms: 0.5 }));
      const r = analyzeVoiceSegment({ words, durationSec: 2, volumeSamples: samples });
      expect(r.volumeVariance).toBeLessThan(0.05);
    });

    it('сильно меняющаяся громкость → variance > 0 → бонус к emotionalActivation', () => {
      const words = Array.from({ length: 40 }, (_, i) => w('word', i * 0.3, i * 0.3 + 0.2));
      // 40 слов за 10с = 240 WPM (rushed) + high variance
      const samples = Array.from({ length: 20 }, (_, i) => ({
        t: i * 0.1,
        rms: i % 2 === 0 ? 0.1 : 0.9,
      }));
      const r = analyzeVoiceSegment({ words, durationSec: 10, volumeSamples: samples });
      expect(r.volumeVariance).toBeGreaterThan(0.3);
      expect(r.indicators.emotionalActivation).toBeGreaterThan(0);
    });

    it('без volumeSamples → variance=0, flatAffect высокий (если медленный темп)', () => {
      // 10 слов / 10с = 60 WPM = slow
      const words = Array.from({ length: 10 }, (_, i) => w('word', i * 1, i * 1 + 0.3));
      const r = analyzeVoiceSegment(buildSegment(words, 10));
      expect(r.volumeVariance).toBe(0);
      expect(r.indicators.flatAffect).toBeGreaterThan(0.5);
    });
  });

  describe('композитные индикаторы (клиническая интерпретация)', () => {
    it('flatAffect: медленный темп + flat volume → высокий (риск диссоциации)', () => {
      const words = Array.from({ length: 5 }, (_, i) => w('word', i * 2, i * 2 + 0.5));
      // 5 слов / 30с = 10 WPM
      const samples = Array.from({ length: 20 }, (_, i) => ({ t: i * 1.5, rms: 0.5 }));
      const r = analyzeVoiceSegment({ words, durationSec: 30, volumeSamples: samples });
      expect(r.indicators.flatAffect).toBeGreaterThan(0.7);
    });

    it('emotionalActivation: быстрый темп + high variance → высокий', () => {
      const words = Array.from({ length: 60 }, (_, i) => w('word', i * 0.2, i * 0.2 + 0.15));
      // 60 / 12 = 300 WPM
      const samples = Array.from({ length: 30 }, (_, i) => ({
        t: i * 0.4,
        rms: i % 2 === 0 ? 0.1 : 0.9,
      }));
      const r = analyzeVoiceSegment({ words, durationSec: 12, volumeSamples: samples });
      expect(r.indicators.emotionalActivation).toBeGreaterThan(0.5);
    });

    it('все индикаторы в диапазоне [0, 1]', () => {
      const words = Array.from({ length: 100 }, (_, i) => w('эм', i * 0.1, i * 0.1 + 0.05));
      const samples = Array.from({ length: 50 }, (_, i) => ({
        t: i * 0.2,
        rms: i % 2 === 0 ? 0 : 1,
      }));
      const r = analyzeVoiceSegment({ words, durationSec: 10, volumeSamples: samples });

      for (const [, value] of Object.entries(r.indicators)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('форматирование результата', () => {
    it('wpm округлён до целого', () => {
      const words = Array.from({ length: 7 }, (_, i) => w('word', i * 1, i * 1 + 0.3));
      const r = analyzeVoiceSegment(buildSegment(words, 10));
      expect(Number.isInteger(r.wpm)).toBe(true);
    });

    it('ratio/variance округлены до 3 знаков', () => {
      const words = [w('эм', 0, 0.5), w('ну', 1.0, 1.5), w('хорошо', 2.0, 2.5)];
      const r = analyzeVoiceSegment(buildSegment(words, 5));
      expect(r.fillerWordRatio.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
    });
  });
});
