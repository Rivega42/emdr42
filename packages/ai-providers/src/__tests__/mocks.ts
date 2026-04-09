import type {
  LlmProvider,
  ChatMessage,
  ChatResponse,
  LlmOptions,
  SttProvider,
  SttOptions,
  TranscriptionResult,
  TranscriptionChunk,
  TtsProvider,
  TtsOptions,
  SpeechResult,
  VoiceInfo,
} from '../types';

export class MockLlmProvider implements LlmProvider {
  name = 'mock-llm';
  shouldFail = false;
  lastMessages: ChatMessage[] = [];
  lastOptions?: LlmOptions;

  async chat(
    messages: ChatMessage[],
    options?: LlmOptions
  ): Promise<ChatResponse> {
    this.lastMessages = messages;
    this.lastOptions = options;
    if (this.shouldFail) throw new Error('Mock LLM failed');
    return {
      content: 'Mock response',
      usage: { promptTokens: 10, completionTokens: 20 },
      model: 'mock-model',
      latencyMs: 100,
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: LlmOptions
  ): AsyncGenerator<string> {
    this.lastMessages = messages;
    this.lastOptions = options;
    if (this.shouldFail) throw new Error('Mock LLM stream failed');
    yield 'Mock ';
    yield 'stream ';
    yield 'response';
  }

  async isAvailable(): Promise<boolean> {
    return !this.shouldFail;
  }
}

export class MockSttProvider implements SttProvider {
  name = 'mock-stt';
  shouldFail = false;
  lastAudio?: Buffer;
  lastOptions?: SttOptions;

  async transcribe(
    audio: Buffer,
    options?: SttOptions
  ): Promise<TranscriptionResult> {
    this.lastAudio = audio;
    this.lastOptions = options;
    if (this.shouldFail) throw new Error('Mock STT failed');
    return {
      text: 'Mock transcription',
      language: 'en',
      confidence: 0.95,
      durationMs: 1000,
    };
  }

  async *transcribeStream(
    _audioStream: ReadableStream,
    _options?: SttOptions
  ): AsyncGenerator<TranscriptionChunk> {
    if (this.shouldFail) throw new Error('Mock STT stream failed');
    yield { text: 'Mock ', isFinal: false, confidence: 0.9 };
    yield { text: 'transcription', isFinal: true, confidence: 0.95 };
  }

  async isAvailable(): Promise<boolean> {
    return !this.shouldFail;
  }
}

export class MockTtsProvider implements TtsProvider {
  name = 'mock-tts';
  shouldFail = false;
  lastText?: string;
  lastOptions?: TtsOptions;

  async synthesize(
    text: string,
    options?: TtsOptions
  ): Promise<SpeechResult> {
    this.lastText = text;
    this.lastOptions = options;
    if (this.shouldFail) throw new Error('Mock TTS failed');
    return {
      audio: Buffer.from('mock-audio-data'),
      format: 'mp3',
      durationMs: 2000,
      sampleRate: 24000,
    };
  }

  async *synthesizeStream(
    text: string,
    options?: TtsOptions
  ): AsyncGenerator<Buffer> {
    this.lastText = text;
    this.lastOptions = options;
    if (this.shouldFail) throw new Error('Mock TTS stream failed');
    yield Buffer.from('chunk1');
    yield Buffer.from('chunk2');
  }

  async getVoices(): Promise<VoiceInfo[]> {
    return [
      { id: 'voice1', name: 'Voice One', language: 'en', gender: 'female' },
      { id: 'voice2', name: 'Voice Two', language: 'en', gender: 'male' },
    ];
  }

  async isAvailable(): Promise<boolean> {
    return !this.shouldFail;
  }
}
