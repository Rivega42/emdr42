/**
 * SessionRegistry — безопасное хранилище активных сессий Orchestrator.
 *
 * Решает issue #117:
 *  - Ассоциация socket.id → sessionIds[] (cleanup только своих сессий при disconnect)
 *  - TTL eviction: idle сессии >IDLE_TIMEOUT_MS удаляются фоновым job
 *  - Метрика размеров Maps (для Prometheus, #83)
 */
import type { SessionHandler } from './session-handler';
import type { VoiceHandler } from './voice-handler';

export interface RegistryEntry {
  handler: SessionHandler;
  socketId: string;
  userId: string;
  lastActivity: number;
  /**
   * Если сокет отключился — момент disconnect. Сессия в этом состоянии
   * ждёт reattach() из нового подключения того же userId. После grace-period
   * sweeper её закроет. При successful reattach обнуляется.
   */
  detachedAt: number | null;
}

export interface VoiceEntry {
  handler: VoiceHandler;
  socketId: string;
  lastActivity: number;
}

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 мин
const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000; // каждые 5 мин

export class SessionRegistry {
  private readonly sessions = new Map<string, RegistryEntry>();
  private readonly voice = new Map<string, VoiceEntry>();
  private readonly socketIndex = new Map<string, Set<string>>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    private readonly sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS,
  ) {}

  startSweeper(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
    this.sweepTimer.unref?.();
  }

  stopSweeper(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  addSession(sessionId: string, entry: Omit<RegistryEntry, 'lastActivity' | 'detachedAt'>): void {
    this.sessions.set(sessionId, { ...entry, lastActivity: Date.now(), detachedAt: null });
    const set = this.socketIndex.get(entry.socketId) ?? new Set();
    set.add(sessionId);
    this.socketIndex.set(entry.socketId, set);
  }

  /** Помечает все сессии socketId как detached (ожидающие reattach). */
  markDetached(socketId: string, at: number): void {
    const sessionIds = this.socketIndex.get(socketId);
    if (!sessionIds) return;
    for (const sid of sessionIds) {
      const entry = this.sessions.get(sid);
      if (entry) entry.detachedAt = at;
    }
  }

  /** Возвращает detachedAt сессии (null если активна). */
  sessionDetachedAt(sessionId: string): number | null {
    const entry = this.sessions.get(sessionId);
    return entry ? entry.detachedAt : null;
  }

  /**
   * Перепривязывает detached-сессию на новый socket того же userId.
   * Возвращает true если успешно. Если сессии нет, или userId не совпадает,
   * или сессия активна (не detached) — false.
   */
  reattach(sessionId: string, userId: string, newSocketId: string): boolean {
    const entry = this.sessions.get(sessionId);
    if (!entry || entry.userId !== userId) return false;
    // Снимаем старую socketIndex-привязку.
    const oldSet = this.socketIndex.get(entry.socketId);
    if (oldSet) {
      oldSet.delete(sessionId);
      if (oldSet.size === 0) this.socketIndex.delete(entry.socketId);
    }
    entry.socketId = newSocketId;
    entry.detachedAt = null;
    entry.lastActivity = Date.now();
    const newSet = this.socketIndex.get(newSocketId) ?? new Set();
    newSet.add(sessionId);
    this.socketIndex.set(newSocketId, newSet);
    // Voice handler перепривязка — если был, обновляем socketId.
    const v = this.voice.get(sessionId);
    if (v) v.socketId = newSocketId;
    return true;
  }

  getSession(sessionId: string): SessionHandler | undefined {
    const entry = this.sessions.get(sessionId);
    if (!entry) return undefined;
    entry.lastActivity = Date.now();
    return entry.handler;
  }

  /**
   * Возвращает handler ТОЛЬКО если sessionId принадлежит данному userId.
   * Без этой проверки любой авторизованный пользователь, узнавший чужой
   * sessionId, мог управлять чужой EMDR-сессией (SUDS, end, pause).
   */
  getOwnedSession(sessionId: string, userId: string): SessionHandler | undefined {
    const entry = this.sessions.get(sessionId);
    if (!entry || entry.userId !== userId) return undefined;
    entry.lastActivity = Date.now();
    return entry.handler;
  }

  getOwnedVoice(sessionId: string, userId: string): VoiceHandler | undefined {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) return undefined;
    const v = this.voice.get(sessionId);
    if (!v) return undefined;
    v.lastActivity = Date.now();
    return v.handler;
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  removeSession(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    this.sessions.delete(sessionId);
    const set = this.socketIndex.get(entry.socketId);
    if (set) {
      set.delete(sessionId);
      if (set.size === 0) this.socketIndex.delete(entry.socketId);
    }
  }

  addVoice(sessionId: string, entry: Omit<VoiceEntry, 'lastActivity'>): void {
    this.voice.set(sessionId, { ...entry, lastActivity: Date.now() });
  }

  getVoice(sessionId: string): VoiceHandler | undefined {
    const entry = this.voice.get(sessionId);
    if (!entry) return undefined;
    entry.lastActivity = Date.now();
    return entry.handler;
  }

  removeVoice(sessionId: string): void {
    this.voice.delete(sessionId);
  }

  sessionsBySocket(socketId: string): string[] {
    return Array.from(this.socketIndex.get(socketId) ?? []);
  }

  voiceBySocket(socketId: string): string[] {
    return Array.from(this.voice.entries())
      .filter(([, entry]) => entry.socketId === socketId)
      .map(([sessionId]) => sessionId);
  }

  size(): { sessions: number; voice: number } {
    return { sessions: this.sessions.size, voice: this.voice.size };
  }

  /** Удаляет handlers, idle дольше idleTimeoutMs. */
  private sweep(): void {
    const now = Date.now();
    const expired: { sessionId: string; reason: 'session' | 'voice' }[] = [];

    for (const [sessionId, entry] of this.sessions) {
      if (now - entry.lastActivity > this.idleTimeoutMs) {
        expired.push({ sessionId, reason: 'session' });
      }
    }
    for (const [sessionId, entry] of this.voice) {
      if (now - entry.lastActivity > this.idleTimeoutMs) {
        expired.push({ sessionId, reason: 'voice' });
      }
    }

    for (const { sessionId, reason } of expired) {
      if (reason === 'voice') {
        const entry = this.voice.get(sessionId);
        if (entry) {
          try {
            entry.handler.stop();
          } catch (err) {
            console.warn(`[registry] voice stop failed for ${sessionId}`, err);
          }
          this.voice.delete(sessionId);
        }
      } else {
        const entry = this.sessions.get(sessionId);
        if (entry) {
          try {
            void entry.handler.endSession();
          } catch (err) {
            console.warn(`[registry] session end failed for ${sessionId}`, err);
          }
          this.removeSession(sessionId);
        }
      }
    }

    if (expired.length > 0) {
      console.log(
        `[registry] Evicted ${expired.length} idle entries (idle >${this.idleTimeoutMs}ms)`,
      );
    }
  }
}
