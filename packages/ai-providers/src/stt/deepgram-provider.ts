import type {
  SttProvider,
  SttOptions,
  TranscriptionResult,
  TranscriptionChunk,
} from '../types';

export interface DeepgramProviderConfig {
  apiKey: string;
  model?: string;
}

const DEEPGRAM_API = 'https://api.deepgram.com/v1';
const DEEPGRAM_WS = 'wss://api.deepgram.com/v1/listen';

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface DeepgramStreamMessage {
  type: string;
  channel?: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words?: DeepgramWord[];
    }>;
  };
  is_final?: boolean;
  speech_final?: boolean;
  start?: number;
  duration?: number;
}

export class DeepgramProvider implements SttProvider {
  readonly name = 'deepgram';
  private apiKey: string;
  private defaultModel: string;

  constructor(config: DeepgramProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.model ?? 'nova-2';
  }

  async transcribe(
    audio: Buffer,
    options?: SttOptions,
  ): Promise<TranscriptionResult> {
    const params = new URLSearchParams({
      model: options?.model ?? this.defaultModel,
      punctuate: 'true',
      utterances: 'true',
    });

    if (options?.language) params.set('language', options.language);
    if (options?.sampleRate)
      params.set('sample_rate', String(options.sampleRate));

    const response = await fetch(`${DEEPGRAM_API}/listen?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'audio/wav',
      },
      body: new Uint8Array(audio),
    });

    if (!response.ok) {
      throw new Error(
        `Deepgram API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      results?: {
        channels?: Array<{
          detected_language?: string;
          alternatives?: Array<{
            transcript?: string;
            confidence?: number;
            words?: DeepgramWord[];
          }>;
        }>;
      };
      metadata?: { duration?: number };
    };

    const channel = data.results?.channels?.[0];
    const result = channel?.alternatives?.[0];

    return {
      text: result?.transcript ?? '',
      language: channel?.detected_language ?? options?.language ?? 'en',
      confidence: result?.confidence ?? 0,
      durationMs: (data.metadata?.duration ?? 0) * 1000,
      words: result?.words?.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
    };
  }

  /**
   * Streaming транскрипция через Deepgram WebSocket (#129).
   *
   * Использует native WebSocket в браузере и `ws` npm package в Node.js.
   * Yields partial (is_final=false) и final (is_final=true) chunks по мере получения.
   */
  async *transcribeStream(
    audioStream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
    options?: SttOptions,
  ): AsyncGenerator<TranscriptionChunk> {
    const params = new URLSearchParams({
      model: options?.model ?? this.defaultModel,
      punctuate: 'true',
      interim_results: 'true',
      smart_format: 'true',
      encoding: options?.encoding ?? 'linear16',
      sample_rate: String(options?.sampleRate ?? 16000),
    });

    if (options?.language) params.set('language', options.language);

    const url = `${DEEPGRAM_WS}?${params.toString()}`;

    // Runtime detection: Node (ws npm) vs browser (native WebSocket)
    const WsImpl: typeof WebSocket =
      typeof WebSocket !== 'undefined'
        ? WebSocket
        : // eslint-disable-next-line @typescript-eslint/no-var-requires
          (require('ws') as typeof WebSocket);

    const ws = new WsImpl(url, {
      // Node ws accepts options объекта, браузерная версия — нет
      // Browser не пропускает custom headers → Authorization приходится через sec-websocket-protocol
      // Для Node: headers работают напрямую
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(typeof window === 'undefined'
        ? {
            headers: { Authorization: `Token ${this.apiKey}` },
          }
        : {}),
    } as unknown as string | string[]);

    // В браузере авторизация только через subprotocol hack:
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        'Deepgram streaming в браузере требует backend proxy с Authorization header. Не используйте напрямую из client.',
      );
    }

    const chunks: TranscriptionChunk[] = [];
    let error: Error | null = null;
    let closed = false;

    const messageHandler = (raw: string | ArrayBuffer | Blob) => {
      try {
        const text = typeof raw === 'string' ? raw : '';
        const msg: DeepgramStreamMessage = JSON.parse(text);
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;
        chunks.push({
          text: alt.transcript ?? '',
          isFinal: msg.is_final ?? false,
          confidence: alt.confidence ?? 0,
        });
      } catch {
        // игнорируем keepalive сообщения
      }
    };

    ws.addEventListener('message', (e: MessageEvent) => messageHandler(e.data));
    ws.addEventListener('error', (e: Event) => {
      error = new Error(`Deepgram WS error: ${(e as ErrorEvent).message ?? 'unknown'}`);
    });
    ws.addEventListener('close', () => {
      closed = true;
    });

    // Ожидание OPEN
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Deepgram WS connect timeout')),
        10_000,
      );
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });

    // Отправляем audio + получаем chunks
    const pumpAudio = async () => {
      try {
        if (audioStream && typeof (audioStream as ReadableStream).getReader === 'function') {
          const reader = (audioStream as ReadableStream<Uint8Array>).getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (ws.readyState === 1) ws.send(value);
          }
        } else {
          for await (const chunk of audioStream as AsyncIterable<Uint8Array>) {
            if (ws.readyState === 1) ws.send(chunk);
          }
        }
        // CloseStream финализирует транскрипцию
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'CloseStream' }));
      } catch (err) {
        error = err as Error;
        ws.close();
      }
    };
    void pumpAudio();

    // Yield chunks по мере получения
    while (!closed || chunks.length > 0) {
      if (chunks.length > 0) {
        const c = chunks.shift()!;
        yield c;
      } else if (!closed) {
        await new Promise((r) => setTimeout(r, 20));
      } else {
        break;
      }
      if (error) throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${DEEPGRAM_API}/projects`, {
        headers: { Authorization: `Token ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
