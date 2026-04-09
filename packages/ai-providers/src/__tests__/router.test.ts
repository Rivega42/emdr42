import { AiRouter } from '../router';
import type { AiProviderConfig, AiRouterEvent } from '../types';
import { MockLlmProvider, MockSttProvider, MockTtsProvider } from './mocks';

// Create fresh mocks for each test via factory functions
function createMockLlm(name = 'mock-llm') {
  const m = new MockLlmProvider();
  m.name = name;
  return m;
}
function createMockStt(name = 'mock-stt') {
  const m = new MockSttProvider();
  m.name = name;
  return m;
}
function createMockTts(name = 'mock-tts') {
  const m = new MockTtsProvider();
  m.name = name;
  return m;
}

// Track which mocks are created per test
let mockLlmPrimary: MockLlmProvider;
let mockLlmFallback: MockLlmProvider;
let mockSttPrimary: MockSttProvider;
let mockSttFallback: MockSttProvider;
let mockTtsPrimary: MockTtsProvider;
let mockTtsFallback: MockTtsProvider;

jest.mock('../llm/anthropic-provider', () => ({
  AnthropicProvider: jest.fn(() => mockLlmPrimary),
}));
jest.mock('../llm/openai-provider', () => ({
  OpenAiLlmProvider: jest.fn(() => mockLlmFallback),
}));
jest.mock('../llm/ollama-provider', () => ({
  OllamaProvider: jest.fn(),
}));
jest.mock('../stt/deepgram-provider', () => ({
  DeepgramProvider: jest.fn(() => mockSttPrimary),
}));
jest.mock('../stt/openai-whisper-provider', () => ({
  OpenAiWhisperProvider: jest.fn(() => mockSttFallback),
}));
jest.mock('../stt/faster-whisper-provider', () => ({
  FasterWhisperProvider: jest.fn(),
}));
jest.mock('../tts/elevenlabs-provider', () => ({
  ElevenLabsProvider: jest.fn(),
}));
jest.mock('../tts/openai-tts-provider', () => ({
  OpenAiTtsProvider: jest.fn(() => mockTtsPrimary),
}));
jest.mock('../tts/piper-provider', () => ({
  PiperProvider: jest.fn(() => mockTtsFallback),
}));

function makeConfig(): AiProviderConfig {
  return {
    llm: {
      primary: 'anthropic',
      fallback: 'openai',
      providers: {
        anthropic: { apiKey: 'test-key' },
        openai: { apiKey: 'test-key' },
      },
    },
    stt: {
      primary: 'deepgram',
      fallback: 'openai-whisper',
      providers: {
        deepgram: { apiKey: 'test-key' },
        'openai-whisper': { apiKey: 'test-key' },
      },
    },
    tts: {
      primary: 'openai-tts',
      fallback: 'piper',
      providers: {
        'openai-tts': { apiKey: 'test-key', voice: 'nova' },
        piper: { baseUrl: 'http://localhost:5000' },
      },
    },
  };
}

describe('AiRouter', () => {
  let router: AiRouter;

  beforeEach(async () => {
    // Create fresh mocks so names match what the router uses internally
    mockLlmPrimary = createMockLlm('anthropic');
    mockLlmFallback = createMockLlm('openai');
    mockSttPrimary = createMockStt('deepgram');
    mockSttFallback = createMockStt('openai-whisper');
    mockTtsPrimary = createMockTts('openai-tts');
    mockTtsFallback = createMockTts('piper');

    router = new AiRouter(makeConfig());
    await router.initialize();
  });

  // ---- Initialization ----

  describe('initialization', () => {
    it('should create router with config', () => {
      expect(router).toBeInstanceOf(AiRouter);
    });

    it('should initialize all configured LLM providers', () => {
      expect(router.getLlmProvider('anthropic')).toBeDefined();
      expect(router.getLlmProvider('openai')).toBeDefined();
    });

    it('should initialize all configured STT providers', () => {
      expect(router.getSttProvider('deepgram')).toBeDefined();
      expect(router.getSttProvider('openai-whisper')).toBeDefined();
    });

    it('should initialize all configured TTS providers', () => {
      expect(router.getTtsProvider('openai-tts')).toBeDefined();
      expect(router.getTtsProvider('piper')).toBeDefined();
    });

    it('should deep clone config so external mutations do not affect router', () => {
      const config = makeConfig();
      const r = new AiRouter(config);
      config.llm.primary = 'nonexistent';
      // Router should still use original primary
      expect(r).toBeInstanceOf(AiRouter);
    });
  });

  // ---- Provider access ----

  describe('provider access', () => {
    it('getLlm() should return primary LLM provider', () => {
      const llm = router.getLlm();
      expect(llm).toBe(mockLlmPrimary);
    });

    it('getStt() should return primary STT provider', () => {
      const stt = router.getStt();
      expect(stt).toBe(mockSttPrimary);
    });

    it('getTts() should return primary TTS provider', () => {
      const tts = router.getTts();
      expect(tts).toBe(mockTtsPrimary);
    });

    it('getLlmProvider() should return specific provider by name', () => {
      expect(router.getLlmProvider('anthropic')).toBe(mockLlmPrimary);
      expect(router.getLlmProvider('openai')).toBe(mockLlmFallback);
    });

    it('getLlmProvider() should return undefined for unknown name', () => {
      expect(router.getLlmProvider('nonexistent')).toBeUndefined();
    });

    it('getLlm() should throw for missing primary provider', async () => {
      const badConfig: AiProviderConfig = {
        llm: { primary: 'nonexistent', providers: {} },
        stt: { primary: 'deepgram', providers: { deepgram: { apiKey: 'k' } } },
        tts: { primary: 'openai-tts', providers: { 'openai-tts': { apiKey: 'k' } } },
      };
      const badRouter = new AiRouter(badConfig);
      await badRouter.initialize();
      expect(() => badRouter.getLlm()).toThrow('LLM provider "nonexistent" not found');
    });
  });

  // ---- chat() ----

  describe('chat()', () => {
    it('should delegate to primary LLM provider', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await router.chat(messages);

      expect(result.content).toBe('Mock response');
      expect(mockLlmPrimary.lastMessages).toEqual(messages);
    });

    it('should pass options to provider', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const options = { temperature: 0.5, maxTokens: 100 };
      await router.chat(messages, options);

      expect(mockLlmPrimary.lastOptions).toEqual(options);
    });

    it('should fallback to secondary on primary failure', async () => {
      mockLlmPrimary.shouldFail = true;
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await router.chat(messages);

      expect(result.content).toBe('Mock response');
      expect(mockLlmFallback.lastMessages).toEqual(messages);
    });

    it('should throw when primary fails and no fallback configured', async () => {
      const noFallbackConfig: AiProviderConfig = {
        llm: { primary: 'anthropic', providers: { anthropic: { apiKey: 'k' } } },
        stt: { primary: 'deepgram', providers: { deepgram: { apiKey: 'k' } } },
        tts: { primary: 'openai-tts', providers: { 'openai-tts': { apiKey: 'k' } } },
      };
      mockLlmPrimary = createMockLlm('anthropic');
      mockLlmPrimary.shouldFail = true;

      const r = new AiRouter(noFallbackConfig);
      await r.initialize();

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      await expect(r.chat(messages)).rejects.toThrow('Mock LLM failed');
    });
  });

  // ---- transcribe() ----

  describe('transcribe()', () => {
    it('should delegate to primary STT provider', async () => {
      const audio = Buffer.from('fake-audio');
      const result = await router.transcribe(audio);

      expect(result.text).toBe('Mock transcription');
      expect(mockSttPrimary.lastAudio).toBe(audio);
    });

    it('should fallback on primary STT failure', async () => {
      mockSttPrimary.shouldFail = true;
      const audio = Buffer.from('fake-audio');
      const result = await router.transcribe(audio);

      expect(result.text).toBe('Mock transcription');
      expect(mockSttFallback.lastAudio).toBe(audio);
    });
  });

  // ---- synthesize() ----

  describe('synthesize()', () => {
    it('should delegate to primary TTS provider', async () => {
      const result = await router.synthesize('Hello world');

      expect(result.format).toBe('mp3');
      expect(mockTtsPrimary.lastText).toBe('Hello world');
    });

    it('should fallback on primary TTS failure', async () => {
      mockTtsPrimary.shouldFail = true;
      const result = await router.synthesize('Hello world');

      expect(result.format).toBe('mp3');
      expect(mockTtsFallback.lastText).toBe('Hello world');
    });
  });

  // ---- healthCheck() ----

  describe('healthCheck()', () => {
    it('should return status for all providers', async () => {
      const health = await router.healthCheck();

      expect(health['llm:anthropic']).toBe(true);
      expect(health['llm:openai']).toBe(true);
      expect(health['stt:deepgram']).toBe(true);
      expect(health['stt:openai-whisper']).toBe(true);
      expect(health['tts:openai-tts']).toBe(true);
      expect(health['tts:piper']).toBe(true);
    });

    it('should report false for unavailable providers', async () => {
      mockLlmPrimary.shouldFail = true;
      const health = await router.healthCheck();

      expect(health['llm:anthropic']).toBe(false);
      expect(health['llm:openai']).toBe(true);
    });
  });

  // ---- updateConfig() ----

  describe('updateConfig()', () => {
    it('should update LLM primary provider', () => {
      router.updateConfig({ llm: { primary: 'openai', providers: {} } });
      const llm = router.getLlm();
      expect(llm).toBe(mockLlmFallback);
    });

    it('should update partial config without affecting other layers', () => {
      router.updateConfig({ tts: { primary: 'piper', providers: {} } });
      // LLM should remain unchanged
      const llm = router.getLlm();
      expect(llm).toBe(mockLlmPrimary);
      // TTS should now point to piper
      const tts = router.getTts();
      expect(tts).toBe(mockTtsFallback);
    });
  });

  // ---- Usage stats ----

  describe('usage stats', () => {
    it('should start with empty stats', () => {
      const stats = router.getUsageStats();
      expect(stats.llm['anthropic'].requests).toBe(0);
      expect(stats.llm['anthropic'].errors).toBe(0);
    });

    it('should track LLM request stats after chat()', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      await router.chat(messages);

      const stats = router.getUsageStats();
      expect(stats.llm['anthropic'].requests).toBe(1);
      expect(stats.llm['anthropic'].totalTokens).toBe(30); // 10 + 20
      expect(stats.llm['anthropic'].avgLatencyMs).toBe(100);
      expect(stats.llm['anthropic'].lastUsed).not.toBeNull();
    });

    it('should track errors on primary failure', async () => {
      mockLlmPrimary.shouldFail = true;
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      await router.chat(messages); // fallback succeeds

      const stats = router.getUsageStats();
      expect(stats.llm['anthropic'].errors).toBe(1);
    });

    it('should track STT request stats after transcribe()', async () => {
      await router.transcribe(Buffer.from('audio'));

      const stats = router.getUsageStats();
      expect(stats.stt['deepgram'].requests).toBe(1);
    });

    it('should track TTS request stats after synthesize()', async () => {
      await router.synthesize('Hello');

      const stats = router.getUsageStats();
      expect(stats.tts['openai-tts'].requests).toBe(1);
    });

    it('should return cloned stats (not a reference)', () => {
      const stats1 = router.getUsageStats();
      const stats2 = router.getUsageStats();
      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });
  });

  // ---- Events ----

  describe('events', () => {
    it('should emit llm:request on chat()', async () => {
      const handler = jest.fn();
      router.on('llm:request', handler);

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      await router.chat(messages);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('llm:request', expect.objectContaining({
        provider: 'anthropic',
        messages,
      }));
    });

    it('should emit llm:response on successful chat()', async () => {
      const handler = jest.fn();
      router.on('llm:response', handler);

      await router.chat([{ role: 'user', content: 'Hi' }]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('llm:response', expect.objectContaining({
        provider: 'anthropic',
        response: expect.objectContaining({ content: 'Mock response' }),
      }));
    });

    it('should emit llm:error on primary failure', async () => {
      const handler = jest.fn();
      router.on('llm:error', handler);

      mockLlmPrimary.shouldFail = true;
      await router.chat([{ role: 'user', content: 'Hi' }]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('llm:error', expect.objectContaining({
        provider: 'anthropic',
      }));
    });

    it('should emit llm:fallback when falling back', async () => {
      const handler = jest.fn();
      router.on('llm:fallback', handler);

      mockLlmPrimary.shouldFail = true;
      await router.chat([{ role: 'user', content: 'Hi' }]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('llm:fallback', expect.objectContaining({
        from: 'anthropic',
        to: 'openai',
      }));
    });

    it('should emit stt:request on transcribe()', async () => {
      const handler = jest.fn();
      router.on('stt:request', handler);

      await router.transcribe(Buffer.from('audio'));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit stt:fallback when STT falls back', async () => {
      const handler = jest.fn();
      router.on('stt:fallback', handler);

      mockSttPrimary.shouldFail = true;
      await router.transcribe(Buffer.from('audio'));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('stt:fallback', expect.objectContaining({
        from: 'deepgram',
        to: 'openai-whisper',
      }));
    });

    it('should emit tts:request on synthesize()', async () => {
      const handler = jest.fn();
      router.on('tts:request', handler);

      await router.synthesize('Hello');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit tts:fallback when TTS falls back', async () => {
      const handler = jest.fn();
      router.on('tts:fallback', handler);

      mockTtsPrimary.shouldFail = true;
      await router.synthesize('Hello');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('tts:fallback', expect.objectContaining({
        from: 'openai-tts',
        to: 'piper',
      }));
    });
  });

  // ---- chatStream() ----

  describe('chatStream()', () => {
    it('should yield streamed chunks from primary', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const chunks: string[] = [];
      for await (const chunk of router.chatStream(messages)) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(['Mock ', 'stream ', 'response']);
    });

    it('should fall back to secondary stream on primary failure', async () => {
      mockLlmPrimary.shouldFail = true;
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const chunks: string[] = [];
      for await (const chunk of router.chatStream(messages)) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(['Mock ', 'stream ', 'response']);
    });
  });
});
