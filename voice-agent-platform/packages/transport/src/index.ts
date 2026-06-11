/**
 * Транспорт аудио клиент ↔ сервер.
 *
 * TODO(extract): перенести из emdr42:
 * - packages/livekit-integration — LiveKit client/server utils (WebRTC)
 * - механика socket-сигналинга из lib/voice-capture.ts (WebSocket fallback)
 */

export interface Transport {
  /** Входящий аудио-поток от клиента. */
  incomingAudio(): AsyncIterable<ArrayBuffer>;
  /** Отправка аудио агента клиенту. */
  sendAudio(chunk: ArrayBuffer): Promise<void>;
  /** Отправка событий пайплайна (транскрипты, статусы) клиенту. */
  sendEvent(event: unknown): Promise<void>;
  close(): Promise<void>;
}
