import type { AiProviderConfig } from './types';

export const DEFAULT_CONFIG: AiProviderConfig = {
  llm: {
    primary: 'anthropic',
    fallback: 'openai',
    providers: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-20250514',
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
      },
      ollama: {
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.1',
      },
    },
  },
  stt: {
    primary: 'deepgram',
    fallback: 'openai-whisper',
    providers: {
      deepgram: {
        apiKey: process.env.DEEPGRAM_API_KEY,
      },
      'openai-whisper': {
        apiKey: process.env.OPENAI_API_KEY,
      },
      'faster-whisper': {
        baseUrl: 'http://localhost:8080',
      },
    },
  },
  tts: {
    primary: 'openai-tts',
    fallback: 'piper',
    providers: {
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY,
      },
      'openai-tts': {
        apiKey: process.env.OPENAI_API_KEY,
        voice: 'nova',
      },
      piper: {
        baseUrl: 'http://localhost:5000',
      },
    },
  },
};
