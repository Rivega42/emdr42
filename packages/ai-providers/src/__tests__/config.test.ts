import { DEFAULT_CONFIG } from '../config';
import type { AiProviderConfig } from '../types';

describe('DEFAULT_CONFIG', () => {
  it('should have all three provider layers configured', () => {
    expect(DEFAULT_CONFIG.llm).toBeDefined();
    expect(DEFAULT_CONFIG.stt).toBeDefined();
    expect(DEFAULT_CONFIG.tts).toBeDefined();
  });

  it('should have primary and fallback for LLM', () => {
    expect(DEFAULT_CONFIG.llm.primary).toBe('anthropic');
    expect(DEFAULT_CONFIG.llm.fallback).toBe('openai');
  });

  it('should have primary and fallback for STT', () => {
    expect(DEFAULT_CONFIG.stt.primary).toBe('deepgram');
    expect(DEFAULT_CONFIG.stt.fallback).toBe('openai-whisper');
  });

  it('should have primary and fallback for TTS', () => {
    expect(DEFAULT_CONFIG.tts.primary).toBe('openai-tts');
    expect(DEFAULT_CONFIG.tts.fallback).toBe('piper');
  });

  it('should have all LLM provider configs', () => {
    expect(DEFAULT_CONFIG.llm.providers).toHaveProperty('anthropic');
    expect(DEFAULT_CONFIG.llm.providers).toHaveProperty('openai');
    expect(DEFAULT_CONFIG.llm.providers).toHaveProperty('ollama');
  });

  it('should have all STT provider configs', () => {
    expect(DEFAULT_CONFIG.stt.providers).toHaveProperty('deepgram');
    expect(DEFAULT_CONFIG.stt.providers).toHaveProperty('openai-whisper');
    expect(DEFAULT_CONFIG.stt.providers).toHaveProperty('faster-whisper');
  });

  it('should have all TTS provider configs', () => {
    expect(DEFAULT_CONFIG.tts.providers).toHaveProperty('elevenlabs');
    expect(DEFAULT_CONFIG.tts.providers).toHaveProperty('openai-tts');
    expect(DEFAULT_CONFIG.tts.providers).toHaveProperty('piper');
  });

  it('should have unique provider names across each layer', () => {
    const llmNames = Object.keys(DEFAULT_CONFIG.llm.providers);
    const sttNames = Object.keys(DEFAULT_CONFIG.stt.providers);
    const ttsNames = Object.keys(DEFAULT_CONFIG.tts.providers);

    expect(new Set(llmNames).size).toBe(llmNames.length);
    expect(new Set(sttNames).size).toBe(sttNames.length);
    expect(new Set(ttsNames).size).toBe(ttsNames.length);
  });

  it('should have primary different from fallback', () => {
    expect(DEFAULT_CONFIG.llm.primary).not.toBe(DEFAULT_CONFIG.llm.fallback);
    expect(DEFAULT_CONFIG.stt.primary).not.toBe(DEFAULT_CONFIG.stt.fallback);
    expect(DEFAULT_CONFIG.tts.primary).not.toBe(DEFAULT_CONFIG.tts.fallback);
  });

  it('should have primary provider present in providers map', () => {
    expect(DEFAULT_CONFIG.llm.providers[DEFAULT_CONFIG.llm.primary]).toBeDefined();
    expect(DEFAULT_CONFIG.stt.providers[DEFAULT_CONFIG.stt.primary]).toBeDefined();
    expect(DEFAULT_CONFIG.tts.providers[DEFAULT_CONFIG.tts.primary]).toBeDefined();
  });

  it('should have fallback provider present in providers map', () => {
    expect(DEFAULT_CONFIG.llm.providers[DEFAULT_CONFIG.llm.fallback!]).toBeDefined();
    expect(DEFAULT_CONFIG.stt.providers[DEFAULT_CONFIG.stt.fallback!]).toBeDefined();
    expect(DEFAULT_CONFIG.tts.providers[DEFAULT_CONFIG.tts.fallback!]).toBeDefined();
  });

  it('should reference environment variables for API keys', () => {
    expect(DEFAULT_CONFIG.llm.providers.anthropic).toHaveProperty('apiKey');
    expect(DEFAULT_CONFIG.llm.providers.openai).toHaveProperty('apiKey');
    expect(DEFAULT_CONFIG.stt.providers.deepgram).toHaveProperty('apiKey');
    expect(DEFAULT_CONFIG.tts.providers.elevenlabs).toHaveProperty('apiKey');
  });

  it('should have local-only providers with baseUrl (no API key)', () => {
    expect(DEFAULT_CONFIG.llm.providers.ollama).toHaveProperty('baseUrl');
    expect(DEFAULT_CONFIG.llm.providers.ollama).not.toHaveProperty('apiKey');
    expect(DEFAULT_CONFIG.stt.providers['faster-whisper']).toHaveProperty('baseUrl');
    expect(DEFAULT_CONFIG.stt.providers['faster-whisper']).not.toHaveProperty('apiKey');
    expect(DEFAULT_CONFIG.tts.providers.piper).toHaveProperty('baseUrl');
    expect(DEFAULT_CONFIG.tts.providers.piper).not.toHaveProperty('apiKey');
  });

  it('should conform to AiProviderConfig type', () => {
    const config: AiProviderConfig = DEFAULT_CONFIG;
    expect(config).toBeDefined();
    expect(typeof config.llm.primary).toBe('string');
    expect(typeof config.stt.primary).toBe('string');
    expect(typeof config.tts.primary).toBe('string');
  });
});
