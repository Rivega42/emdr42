/**
 * Voice pattern analysis (#79).
 *
 * Анализ речевых паттернов пациента по метаданным транскрипта:
 *   - Паузы (hesitation) — индикатор повышенной когнитивной нагрузки или диссоциации
 *   - Темп речи (WPM) — ускорение при тревоге, замедление при диссоциации
 *   - Громкость variation — flat affect vs emotional activation
 *   - Filler words ("эм", "ну", "вот") — нервозность
 *
 * Работает на уровне transcription chunks с timing metadata
 * (start/end per word), которые возвращает Deepgram (#129).
 *
 * Чистый алгоритм без внешних ML моделей — runtime в браузере или Node.
 */

export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number;
  confidence?: number;
}

export interface VoiceSegment {
  words: WordTiming[];
  durationSec: number;
  /** Опционально — массив volume samples с timestamps (RMS) */
  volumeSamples?: Array<{ t: number; rms: number }>;
}

export interface VoiceAnalysis {
  wpm: number;               // words per minute
  pauseRatio: number;        // 0-1 — доля времени молчания
  longestPauseSec: number;
  pauseCount: number;
  fillerWordRatio: number;   // 0-1 — доля filler words
  volumeVariance: number;    // normalized 0-1 (0 = flat, 1 = heavy variation)
  /** Композитные индикаторы для клинической интерпретации */
  indicators: {
    hesitation: number;       // 0-1
    emotionalActivation: number; // 0-1
    flatAffect: number;       // 0-1
    rushedSpeech: number;     // 0-1
  };
}

const FILLER_WORDS_RU = new Set([
  'эм', 'эмм', 'ээ', 'ммм', 'ну', 'вот', 'типа',
  'как-бы', 'как бы', 'это', 'значит', 'в общем',
]);
const FILLER_WORDS_EN = new Set([
  'um', 'uh', 'er', 'ah', 'like', 'you know',
  'i mean', 'so', 'basically', 'actually',
]);

const PAUSE_THRESHOLD_SEC = 0.8;    // 800ms — пауза
const LONG_PAUSE_SEC = 3.0;          // 3s+ — длинная пауза (potential dissociation)

export function analyzeVoiceSegment(segment: VoiceSegment): VoiceAnalysis {
  const { words, durationSec, volumeSamples } = segment;

  if (words.length === 0 || durationSec <= 0) {
    return emptyAnalysis();
  }

  // WPM
  const wordCount = words.length;
  const wpm = (wordCount / durationSec) * 60;

  // Pauses
  const pauses: number[] = [];
  let totalPauseTime = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= PAUSE_THRESHOLD_SEC) {
      pauses.push(gap);
      totalPauseTime += gap;
    }
  }
  const pauseRatio = Math.min(totalPauseTime / durationSec, 1);
  const longestPauseSec = pauses.length > 0 ? Math.max(...pauses) : 0;

  // Filler words
  const fillerCount = words.filter((w) => {
    const lower = w.word.toLowerCase().replace(/[.,!?]/g, '');
    return FILLER_WORDS_RU.has(lower) || FILLER_WORDS_EN.has(lower);
  }).length;
  const fillerWordRatio = fillerCount / wordCount;

  // Volume variance
  let volumeVariance = 0;
  if (volumeSamples && volumeSamples.length > 1) {
    const mean = volumeSamples.reduce((s, v) => s + v.rms, 0) / volumeSamples.length;
    const variance =
      volumeSamples.reduce((s, v) => s + Math.pow(v.rms - mean, 2), 0) /
      volumeSamples.length;
    volumeVariance = Math.min(Math.sqrt(variance) / Math.max(mean, 0.01), 1);
  }

  // Composite indicators
  const hesitation = clamp(
    pauseRatio * 0.5 + fillerWordRatio * 0.5 + (longestPauseSec > LONG_PAUSE_SEC ? 0.3 : 0),
    0,
    1,
  );

  // Высокий WPM + высокая variance = эмоциональная активация
  const normalizedWpm = clamp((wpm - 100) / 100, -1, 1); // 100 WPM = baseline
  const emotionalActivation = clamp(
    (normalizedWpm > 0 ? normalizedWpm : 0) * 0.5 + volumeVariance * 0.5,
    0,
    1,
  );

  // Низкая variance + медленный темп = flat affect (риск диссоциации)
  const flatAffect = clamp(
    (normalizedWpm < 0 ? -normalizedWpm : 0) * 0.5 + (1 - volumeVariance) * 0.5,
    0,
    1,
  );

  const rushedSpeech = clamp(normalizedWpm > 0.5 ? normalizedWpm : 0, 0, 1);

  return {
    wpm: Math.round(wpm),
    pauseRatio: +pauseRatio.toFixed(3),
    longestPauseSec: +longestPauseSec.toFixed(2),
    pauseCount: pauses.length,
    fillerWordRatio: +fillerWordRatio.toFixed(3),
    volumeVariance: +volumeVariance.toFixed(3),
    indicators: {
      hesitation: +hesitation.toFixed(3),
      emotionalActivation: +emotionalActivation.toFixed(3),
      flatAffect: +flatAffect.toFixed(3),
      rushedSpeech: +rushedSpeech.toFixed(3),
    },
  };
}

function emptyAnalysis(): VoiceAnalysis {
  return {
    wpm: 0,
    pauseRatio: 0,
    longestPauseSec: 0,
    pauseCount: 0,
    fillerWordRatio: 0,
    volumeVariance: 0,
    indicators: {
      hesitation: 0,
      emotionalActivation: 0,
      flatAffect: 0,
      rushedSpeech: 0,
    },
  };
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}
