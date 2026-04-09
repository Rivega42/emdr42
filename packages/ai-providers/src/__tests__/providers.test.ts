/**
 * Tests for individual provider constructors, config handling, and structure.
 * All external API calls are mocked — no real network requests.
 */

// ---- Mock external dependencies ----

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation((config: any) => ({
    _config: config,
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
        model: 'claude-sonnet-4-20250514',
      }),
      stream: jest.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk' } };
        },
      }),
    },
  }));
});

jest.mock('openai', () => {
  return jest.fn().mockImplementation((config: any) => ({
    _config: config,
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'response' }, delta: { content: 'chunk' } }],
          usage: { prompt_tokens: 5, completion_tokens: 10 },
          model: 'gpt-4o',
        }),
      },
    },
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({
          text: 'transcribed text',
          language: 'en',
          duration: 2.5,
          words: [],
        }),
      },
      speech: {
        create: jest.fn().mockResolvedValue({
          arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10)),
          body: null,
        }),
      },
    },
    models: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      retrieve: jest.fn().mockResolvedValue({ id: 'whisper-1' }),
    },
  }));
});

// Mock global fetch for providers that use it
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

import { AnthropicProvider } from '../llm/anthropic-provider';
import { OpenAiLlmProvider } from '../llm/openai-provider';
import { OllamaProvider } from '../llm/ollama-provider';
import { DeepgramProvider } from '../stt/deepgram-provider';
import { OpenAiWhisperProvider } from '../stt/openai-whisper-provider';
import { FasterWhisperProvider } from '../stt/faster-whisper-provider';
import { ElevenLabsProvider } from '../tts/elevenlabs-provider';
import { OpenAiTtsProvider } from '../tts/openai-tts-provider';
import { PiperProvider } from '../tts/piper-provider';

describe('LLM Providers', () => {
  describe('AnthropicProvider', () => {
    it('should construct with apiKey and default model', () => {
      const provider = new AnthropicProvider({ apiKey: 'test-key' });
      expect(provider.name).toBe('anthropic');
    });

    it('should accept custom model', () => {
      const provider = new AnthropicProvider({ apiKey: 'key', model: 'claude-3-haiku' });
      expect(provider.name).toBe('anthropic');
    });

    it('should extract system messages from chat messages', async () => {
      const provider = new AnthropicProvider({ apiKey: 'key' });
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ];
      const result = await provider.chat(messages);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should support systemPrompt via options', async () => {
      const provider = new AnthropicProvider({ apiKey: 'key' });
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await provider.chat(messages, { systemPrompt: 'Be concise' });
      expect(result).toBeDefined();
    });

    it('should implement isAvailable()', async () => {
      const provider = new AnthropicProvider({ apiKey: 'key' });
      const available = await provider.isAvailable();
      // Mocked create resolves, so should return true
      expect(typeof available).toBe('boolean');
    });
  });

  describe('OpenAiLlmProvider', () => {
    it('should construct with apiKey and default model', () => {
      const provider = new OpenAiLlmProvider({ apiKey: 'test-key' });
      expect(provider.name).toBe('openai');
    });

    it('should accept custom baseUrl', () => {
      const provider = new OpenAiLlmProvider({
        apiKey: 'key',
        baseUrl: 'https://custom.api.com/v1',
      });
      expect(provider.name).toBe('openai');
    });

    it('should accept custom model', () => {
      const provider = new OpenAiLlmProvider({ apiKey: 'key', model: 'gpt-3.5-turbo' });
      expect(provider.name).toBe('openai');
    });

    it('should implement chat()', async () => {
      const provider = new OpenAiLlmProvider({ apiKey: 'key' });
      const result = await provider.chat([{ role: 'user', content: 'Hi' }]);
      expect(result.content).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.model).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should prepend system prompt via options', async () => {
      const provider = new OpenAiLlmProvider({ apiKey: 'key' });
      const result = await provider.chat(
        [{ role: 'user', content: 'Hi' }],
        { systemPrompt: 'Be helpful' }
      );
      expect(result).toBeDefined();
    });
  });

  describe('OllamaProvider', () => {
    it('should construct with default config', () => {
      const provider = new OllamaProvider();
      expect(provider.name).toBe('ollama');
    });

    it('should accept custom baseUrl', () => {
      const provider = new OllamaProvider({ baseUrl: 'http://gpu-server:11434/v1' });
      expect(provider.name).toBe('ollama');
    });

    it('should accept custom model', () => {
      const provider = new OllamaProvider({ model: 'codellama' });
      expect(provider.name).toBe('ollama');
    });

    it('should use fetch for isAvailable() health check', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434/v1' });
      const available = await provider.isAvailable();
      expect(available).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });

    it('should return false from isAvailable() when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      const provider = new OllamaProvider();
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });
});

describe('STT Providers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('DeepgramProvider', () => {
    it('should construct with apiKey', () => {
      const provider = new DeepgramProvider({ apiKey: 'dg-key' });
      expect(provider.name).toBe('deepgram');
    });

    it('should accept custom model', () => {
      const provider = new DeepgramProvider({ apiKey: 'key', model: 'nova-3' });
      expect(provider.name).toBe('deepgram');
    });

    it('should call Deepgram API on transcribe()', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: {
            channels: [{
              alternatives: [{ transcript: 'hello world', confidence: 0.98 }],
              detected_language: 'en',
            }],
          },
          metadata: { duration: 1.5 },
        }),
      });

      const provider = new DeepgramProvider({ apiKey: 'key' });
      const result = await provider.transcribe(Buffer.from('audio'));
      expect(result.text).toBe('hello world');
      expect(result.confidence).toBe(0.98);
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const provider = new DeepgramProvider({ apiKey: 'bad-key' });
      await expect(provider.transcribe(Buffer.from('audio'))).rejects.toThrow(
        'Deepgram API error: 401 Unauthorized'
      );
    });

    it('should throw on streaming (not implemented)', async () => {
      const provider = new DeepgramProvider({ apiKey: 'key' });
      const gen = provider.transcribeStream(null as any);
      await expect(gen.next()).rejects.toThrow('WebSocket');
    });
  });

  describe('OpenAiWhisperProvider', () => {
    it('should construct with apiKey', () => {
      const provider = new OpenAiWhisperProvider({ apiKey: 'oai-key' });
      expect(provider.name).toBe('openai-whisper');
    });

    it('should accept custom model', () => {
      const provider = new OpenAiWhisperProvider({ apiKey: 'key', model: 'whisper-2' });
      expect(provider.name).toBe('openai-whisper');
    });

    it('should throw on streaming (not implemented)', async () => {
      const provider = new OpenAiWhisperProvider({ apiKey: 'key' });
      const gen = provider.transcribeStream(null as any);
      await expect(gen.next()).rejects.toThrow('does not support streaming');
    });
  });

  describe('FasterWhisperProvider', () => {
    it('should construct with default config', () => {
      const provider = new FasterWhisperProvider();
      expect(provider.name).toBe('faster-whisper');
    });

    it('should accept custom baseUrl', () => {
      const provider = new FasterWhisperProvider({ baseUrl: 'http://gpu:8080' });
      expect(provider.name).toBe('faster-whisper');
    });

    it('should use fetch-based health check for isAvailable()', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const provider = new FasterWhisperProvider({ baseUrl: 'http://localhost:8080' });
      const available = await provider.isAvailable();
      expect(available).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/health');
    });

    it('should return false from isAvailable() when server is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const provider = new FasterWhisperProvider();
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should throw on API error during transcribe()', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      const provider = new FasterWhisperProvider();
      await expect(provider.transcribe(Buffer.from('audio'))).rejects.toThrow(
        'Faster-Whisper API error: 500 Internal Server Error'
      );
    });
  });
});

describe('TTS Providers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('ElevenLabsProvider', () => {
    it('should construct with apiKey', () => {
      const provider = new ElevenLabsProvider({ apiKey: 'el-key' });
      expect(provider.name).toBe('elevenlabs');
    });

    it('should accept custom voiceId and model', () => {
      const provider = new ElevenLabsProvider({
        apiKey: 'key',
        voiceId: 'custom-voice',
        model: 'eleven_monolingual_v1',
      });
      expect(provider.name).toBe('elevenlabs');
    });

    it('should call getVoices() and parse response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          voices: [
            {
              voice_id: 'v1',
              name: 'Rachel',
              labels: { language: 'en', gender: 'female' },
              preview_url: 'https://example.com/preview.mp3',
            },
          ],
        }),
      });

      const provider = new ElevenLabsProvider({ apiKey: 'key' });
      const voices = await provider.getVoices();
      expect(voices).toHaveLength(1);
      expect(voices[0]).toEqual({
        id: 'v1',
        name: 'Rachel',
        language: 'en',
        gender: 'female',
        preview_url: 'https://example.com/preview.mp3',
      });
    });

    it('should throw on synthesize() API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const provider = new ElevenLabsProvider({ apiKey: 'bad-key' });
      await expect(provider.synthesize('Hello')).rejects.toThrow(
        'ElevenLabs API error: 403 Forbidden'
      );
    });

    it('should use fetch-based isAvailable()', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const provider = new ElevenLabsProvider({ apiKey: 'key' });
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('OpenAiTtsProvider', () => {
    it('should construct with apiKey', () => {
      const provider = new OpenAiTtsProvider({ apiKey: 'oai-key' });
      expect(provider.name).toBe('openai-tts');
    });

    it('should accept custom voice', () => {
      const provider = new OpenAiTtsProvider({ apiKey: 'key', voice: 'echo' });
      expect(provider.name).toBe('openai-tts');
    });

    it('should return static list from getVoices()', async () => {
      const provider = new OpenAiTtsProvider({ apiKey: 'key' });
      const voices = await provider.getVoices();
      expect(voices.length).toBe(6);
      expect(voices.map((v) => v.id)).toEqual(
        expect.arrayContaining(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
      );
    });
  });

  describe('PiperProvider', () => {
    it('should construct with default config', () => {
      const provider = new PiperProvider();
      expect(provider.name).toBe('piper');
    });

    it('should accept custom baseUrl and voice', () => {
      const provider = new PiperProvider({
        baseUrl: 'http://piper:5000',
        voice: 'en_GB-alba-medium',
      });
      expect(provider.name).toBe('piper');
    });

    it('should use fetch-based isAvailable() health check', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const provider = new PiperProvider({ baseUrl: 'http://localhost:5000' });
      const available = await provider.isAvailable();
      expect(available).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/health');
    });

    it('should return false from isAvailable() when server is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const provider = new PiperProvider();
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should return empty array from getVoices() when server fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      const provider = new PiperProvider();
      const voices = await provider.getVoices();
      expect(voices).toEqual([]);
    });

    it('should throw on synthesize() API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      const provider = new PiperProvider();
      await expect(provider.synthesize('Hello')).rejects.toThrow(
        'Piper TTS error: 500 Internal Server Error'
      );
    });
  });
});
