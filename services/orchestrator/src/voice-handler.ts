/**
 * VoiceHandler — realtime голосовой pipeline: STT → LLM → TTS
 *
 * Поток:
 * 1. Браузер отправляет аудио-чанки через socket.io
 * 2. VoiceHandler стримит их в Vosk WebSocket (STT)
 * 3. Финальная транскрипция отправляется в Ollama (LLM)
 * 4. Ответ LLM отправляется в Piper (TTS)
 * 5. Аудио-ответ стримится обратно в браузер
 */

import WebSocket from 'ws';
import http from 'http';
import type { Socket } from 'socket.io';

export interface VoiceConfig {
  voskUrl: string;
  ollamaUrl: string;
  piperUrl: string;
  ollamaModel: string;
}

export class VoiceHandler {
  private config: VoiceConfig;
  private socket: Socket;
  private voskWs: WebSocket | null = null;
  private isActive = false;
  private conversationHistory: { role: string; content: string }[] = [];

  constructor(socket: Socket, config: VoiceConfig) {
    this.socket = socket;
    this.config = config;
  }

  /** Начать голосовую сессию — подключение к Vosk */
  async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;

    try {
      this.voskWs = new WebSocket(this.config.voskUrl);

      this.voskWs.on('open', () => {
        // Конфигурация Vosk: 16kHz моно
        this.voskWs!.send(JSON.stringify({
          config: { sample_rate: 16000 },
        }));
        this.emitState('listening');
        console.log('[VOICE] Vosk STT подключён');
      });

      this.voskWs.on('message', async (data: WebSocket.Data) => {
        const result = JSON.parse(data.toString());

        // Частичная транскрипция (realtime feedback)
        if (result.partial) {
          this.socket.emit('voice:transcript', {
            text: result.partial,
            isFinal: false,
          });
        }

        // Финальная транскрипция — запускаем LLM → TTS
        if (result.text && result.text.trim()) {
          const transcript = result.text.trim();
          this.socket.emit('voice:transcript', {
            text: transcript,
            isFinal: true,
          });
          await this.processTranscript(transcript);
        }
      });

      this.voskWs.on('error', (err) => {
        console.error('[VOICE] Vosk ошибка:', err.message);
        this.emitState('idle');
      });

      this.voskWs.on('close', () => {
        console.log('[VOICE] Vosk отключён');
      });
    } catch (err) {
      console.error('[VOICE] Не удалось подключиться к Vosk:', err);
      this.emitState('idle');
      this.isActive = false;
    }
  }

  /** Принять аудио-чанк от клиента и переслать в Vosk */
  handleAudioChunk(chunk: ArrayBuffer): void {
    if (this.voskWs?.readyState === WebSocket.OPEN) {
      this.voskWs.send(Buffer.from(chunk));
    }
  }

  /** Остановить голосовую сессию */
  stop(): void {
    this.isActive = false;
    if (this.voskWs) {
      // Отправить EOF для получения финальной транскрипции
      this.voskWs.send('{"eof" : 1}');
      this.voskWs.close();
      this.voskWs = null;
    }
    this.emitState('idle');
  }

  /** Обработка транскрипции: LLM → TTS */
  private async processTranscript(text: string): Promise<void> {
    this.emitState('processing');

    try {
      // Шаг 1: Отправить в Ollama LLM
      const llmResponse = await this.queryLLM(text);

      // Шаг 2: Отправить ответ LLM как текст (для чата)
      this.socket.emit('voice:ai_text', { text: llmResponse });

      // Шаг 3: Синтезировать речь через Piper TTS
      this.emitState('speaking');
      const audioBuffer = await this.synthesizeSpeech(llmResponse);

      if (audioBuffer) {
        this.socket.emit('voice:audio_response', audioBuffer);
      }

      this.emitState('listening');
    } catch (err) {
      console.error('[VOICE] Ошибка pipeline:', err);
      this.emitState('listening');
    }
  }

  /** Запрос к Ollama LLM */
  private async queryLLM(userMessage: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    const systemPrompt = [
      'Ты — AI-терапевт, проводящий EMDR-сессию.',
      'Отвечай кратко (1-3 предложения), тепло и поддерживающе.',
      'Говори на языке пациента.',
      'Не используй markdown, эмодзи или форматирование — твой ответ будет озвучен.',
    ].join(' ');

    const body = JSON.stringify({
      model: this.config.ollamaModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory.slice(-20),
      ],
      stream: false,
    });

    const response = await this.httpPost(
      `${this.config.ollamaUrl}/api/chat`,
      body,
      { 'Content-Type': 'application/json' },
    );

    const data = JSON.parse(response);
    const assistantMessage = data.message?.content || '';
    this.conversationHistory.push({ role: 'assistant', content: assistantMessage });
    return assistantMessage;
  }

  /** Синтез речи через Piper TTS */
  private async synthesizeSpeech(text: string): Promise<Buffer | null> {
    try {
      // Piper Wyoming protocol — POST текст, получить WAV
      const response = await this.httpPostBinary(
        `${this.config.piperUrl}/api/tts`,
        JSON.stringify({ text }),
        { 'Content-Type': 'application/json' },
      );
      return response;
    } catch (err) {
      console.error('[VOICE] Piper TTS ошибка:', err);
      return null;
    }
  }

  /** HTTP POST, возвращающий текст */
  private httpPost(url: string, body: string, headers: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'POST',
          headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString()));
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /** HTTP POST, возвращающий бинарные данные */
  private httpPostBinary(url: string, body: string, headers: Record<string, string>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'POST',
          headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private emitState(state: string): void {
    this.socket.emit('voice:state', { state });
  }

  /** Очистка ресурсов */
  dispose(): void {
    this.stop();
    this.conversationHistory = [];
  }
}
