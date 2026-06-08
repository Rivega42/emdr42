/**
 * Redis-backed CircuitStateStore (#C4).
 *
 * Используется orchestrator-ом, когда задана ORCHESTRATOR_REDIS_URL. Без него
 * каждая реплика держит независимый счётчик failures, и при N репликах
 * требуется N × failureThreshold ошибок до открытия — провайдер успевает
 * "сжечь" квоту.
 *
 * Store не делает atomic CAS — для нашей задачи (детект массивного fail)
 * это допустимо: возможный конфликт = ±1 failure в окне. Если потребуется
 * строгая атомарность — переведём на Lua-script.
 *
 * Тип Redis-клиента не импортируется напрямую — принимаем minimal
 * interface, совместимый с ioredis. Это позволяет пакету не тянуть ioredis
 * как peer dependency.
 */

import type { CircuitState, CircuitStateStore } from './circuit-breaker';

export interface MinimalRedis {
  get(key: string): Promise<string | null>;
  // Только get + setex используются. set намеренно НЕ объявлен — его
  // перегрузки в ioredis несовместимы с упрощённой сигнатурой и ломают
  // структурную совместимость при передаче Redis-инстанса.
  setex(key: string, seconds: number, value: string): Promise<unknown>;
}

export class RedisCircuitStateStore implements CircuitStateStore {
  constructor(
    private readonly redis: MinimalRedis,
    private readonly opts: {
      /** Префикс ключей. По умолчанию `cb:`. */
      keyPrefix?: string;
      /** TTL ключа в секундах. Должен покрывать failureWindowMs + halfOpenAfterMs. */
      ttlSec?: number;
    } = {},
  ) {}

  private key(name: string): string {
    return `${this.opts.keyPrefix ?? 'cb:'}${name}`;
  }

  async loadState(name: string): Promise<{
    state: CircuitState;
    failures: number[];
    openedAt: number;
  } | null> {
    const raw = await this.redis.get(this.key(name));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        state: CircuitState;
        failures: number[];
        openedAt: number;
      };
      if (!Array.isArray(parsed.failures)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async saveState(
    name: string,
    s: { state: CircuitState; failures: number[]; openedAt: number },
  ): Promise<void> {
    const ttl = this.opts.ttlSec ?? 600; // 10 минут — достаточно для большинства окон
    await this.redis.setex(this.key(name), ttl, JSON.stringify(s));
  }
}
