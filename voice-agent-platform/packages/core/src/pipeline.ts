/**
 * VoicePipeline — оркестрация VAD → STT → AgentBackend → TTS.
 *
 * Отвечает за turn-taking и barge-in:
 * - endpointing: тишина N мс после речи юзера → передача хода агенту
 * - barge-in: VAD-активность юзера во время речи агента → abort бэкенда,
 *   сброс TTS-очереди, событие 'interrupted'
 *
 * TODO(extract): перенести реализацию из emdr42 services/orchestrator
 * (voice pipeline) и lib/voice-capture.ts, отвязав от EMDR-домена.
 */
import type { AgentBackend } from './backend';
import type { AgentConfig, PipelineEvent, SessionOptions } from './types';

export interface SttAdapter {
  /** Стриминговый STT: аудио-чанки на входе, partial/final транскрипты на выходе. */
  transcribe(audio: AsyncIterable<ArrayBuffer>): AsyncIterable<{ text: string; final: boolean }>;
}

export interface TtsAdapter {
  /** Стриминговый TTS: текстовые дельты на входе, аудио-чанки на выходе. */
  synthesize(
    text: AsyncIterable<string>,
    voice: { voiceId: string; speed?: number },
  ): AsyncIterable<ArrayBuffer>;
}

export interface VadAdapter {
  /** Детекция речи в аудио-потоке (для endpointing и barge-in). */
  detect(audio: AsyncIterable<ArrayBuffer>): AsyncIterable<{ speaking: boolean }>;
}

export interface PipelineDeps {
  stt: SttAdapter;
  tts: TtsAdapter;
  vad: VadAdapter;
  backend: AgentBackend;
}

export class VoicePipeline {
  constructor(
    private readonly config: AgentConfig,
    private readonly deps: PipelineDeps,
  ) {}

  /**
   * Запускает сессию: принимает входящий аудио-поток юзера,
   * отдаёт стрим PipelineEvent (транскрипты, аудио агента, статусы).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(_audioIn: AsyncIterable<ArrayBuffer>, _opts?: SessionOptions): AsyncIterable<PipelineEvent> {
    throw new Error(
      'Not implemented: переносится из emdr42 services/orchestrator (см. issue Rivega42/emdr42#268)',
    );
  }
}
