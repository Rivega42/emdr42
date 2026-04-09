/**
 * Service configuration from environment variables.
 */

export interface OrchestratorConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  apiBaseUrl: string;
  redisUrl: string;
  corsOrigin: string;
  ai: {
    llm: {
      primary: string;
      fallback?: string;
      providers: Record<string, Record<string, string>>;
    };
    stt: {
      primary: string;
      fallback?: string;
      providers: Record<string, Record<string, string>>;
    };
    tts: {
      primary: string;
      fallback?: string;
      providers: Record<string, Record<string, string>>;
    };
  };
}

export const loadConfig = (): OrchestratorConfig => {
  const env = (key: string, fallback?: string): string => {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  };

  // Build provider configs from env vars
  const llmProviders: Record<string, Record<string, string>> = {};
  const llmPrimary = env('LLM_PRIMARY', 'anthropic');

  if (process.env.ANTHROPIC_API_KEY) {
    llmProviders.anthropic = { apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    llmProviders.openai = { apiKey: process.env.OPENAI_API_KEY };
  }
  if (process.env.OLLAMA_URL) {
    llmProviders.ollama = { baseUrl: process.env.OLLAMA_URL };
  }

  const sttProviders: Record<string, Record<string, string>> = {};
  if (process.env.DEEPGRAM_API_KEY) {
    sttProviders.deepgram = { apiKey: process.env.DEEPGRAM_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    sttProviders['openai-whisper'] = { apiKey: process.env.OPENAI_API_KEY };
  }

  const ttsProviders: Record<string, Record<string, string>> = {};
  if (process.env.ELEVENLABS_API_KEY) {
    ttsProviders.elevenlabs = { apiKey: process.env.ELEVENLABS_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    ttsProviders['openai-tts'] = { apiKey: process.env.OPENAI_API_KEY };
  }

  return {
    port: parseInt(env('PORT', '8002'), 10),
    nodeEnv: env('NODE_ENV', 'development'),
    jwtSecret: env('JWT_SECRET'),
    apiBaseUrl: env('API_BASE_URL', 'http://localhost:3001'),
    redisUrl: env('REDIS_URL', 'redis://localhost:6379'),
    corsOrigin: env('CORS_ORIGIN', 'http://localhost:3000'),
    ai: {
      llm: {
        primary: llmPrimary,
        fallback: process.env.LLM_FALLBACK,
        providers: llmProviders,
      },
      stt: {
        primary: env('STT_PRIMARY', 'deepgram'),
        fallback: process.env.STT_FALLBACK,
        providers: sttProviders,
      },
      tts: {
        primary: env('TTS_PRIMARY', 'elevenlabs'),
        fallback: process.env.TTS_FALLBACK,
        providers: ttsProviders,
      },
    },
  };
};
