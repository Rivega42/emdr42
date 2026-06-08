export { MovementPatterns } from './patterns/movements';
export { EmotionRecognitionService } from './services/emotion-recognition';
export type { EmotionData, EmotionProfile, TriggerPattern, EmotionConfig } from './services/emotion-recognition';
export { AudioASMRService } from './services/audio-asmr';

// Crisis hotlines (#147)
export { getHotlinesForCountry, HOTLINES } from './crisis/hotlines';
export type { Hotline, CountryHotlines } from './crisis/hotlines';

// Voice pattern analysis (#79)
export { analyzeVoiceSegment } from './voice/voice-analysis';
export type {
  VoiceAnalysis,
  VoiceSegment,
  WordTiming,
} from './voice/voice-analysis';
