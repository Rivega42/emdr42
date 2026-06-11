/**
 * Адаптеры провайдеров.
 *
 * TODO(extract): перенести из emdr42 packages/ai-providers (117 тестов):
 * - LLM: Claude / OpenAI / локальные, fallback-цепочки → LlmBackend
 * - TTS: Piper (self-hosted) / ElevenLabs / OpenAI
 * - STT: Vosk (self-hosted) / faster-whisper / Deepgram
 */
export { OpenClawBackend, type OpenClawBackendOptions } from './openclaw';
