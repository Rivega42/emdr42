/**
 * Event Bus — Redis Pub/Sub для real-time событий между сервисами.
 *
 * Использование:
 *   const bus = new EventBus(process.env.REDIS_URL);
 *   bus.subscribe('session.*', handler);
 *   bus.publish({ type: 'session.emotion', data: { stress: 0.9 } });
 */

import Redis from 'ioredis';

export interface DomainEvent<T = any> {
  type: string;
  data: T;
  correlationId?: string;
  idempotencyKey?: string; // #134
  timestamp?: string;
}

type EventHandler<T = any> = (event: DomainEvent<T>) => void | Promise<void>;

const IDEMPOTENCY_TTL_SEC = 24 * 60 * 60;

export class EventBus {
  private pub: Redis;
  private sub: Redis;
  private handlers = new Map<string, EventHandler[]>();

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);

    this.sub.on('pmessage', async (_pattern, channel, message) => {
      const event: DomainEvent = JSON.parse(message);

      // #134 idempotency — на consumer side тоже dedup
      if (event.idempotencyKey) {
        const redisKey = `eventbus:consumed:${channel}:${event.idempotencyKey}`;
        const already = await this.pub.set(
          redisKey,
          '1',
          'EX',
          IDEMPOTENCY_TTL_SEC,
          'NX',
        );
        if (already === null) {
          // Уже обработано — пропускаем
          return;
        }
      }

      for (const [pattern, handlers] of this.handlers.entries()) {
        if (this.matchPattern(pattern, channel)) {
          for (const h of handlers) {
            try {
              await h(event);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(`[eventBus] handler error for ${channel}:`, err);
            }
          }
        }
      }
    });
  }

  /**
   * Публикация события (#134 idempotency на publisher side).
   * Если idempotencyKey задан, повторная публикация в течение 24h проигнорируется.
   */
  async publish<T>(event: DomainEvent<T>): Promise<{ published: boolean }> {
    if (event.idempotencyKey) {
      const redisKey = `eventbus:published:${event.type}:${event.idempotencyKey}`;
      const ok = await this.pub.set(
        redisKey,
        '1',
        'EX',
        IDEMPOTENCY_TTL_SEC,
        'NX',
      );
      if (ok === null) return { published: false }; // уже публиковано
    }

    const payload = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      correlationId: event.correlationId || crypto.randomUUID(),
    });
    await this.pub.publish(event.type, payload);
    return { published: true };
  }

  /** Подписка на события по паттерну (поддерживает * wildcard) */
  async subscribe(pattern: string, handler: EventHandler): Promise<void> {
    const handlers = this.handlers.get(pattern) || [];
    handlers.push(handler);
    this.handlers.set(pattern, handlers);

    if (handlers.length === 1) {
      await this.sub.psubscribe(pattern);
    }
  }

  /** Отписка от паттерна */
  async unsubscribe(pattern: string): Promise<void> {
    this.handlers.delete(pattern);
    await this.sub.punsubscribe(pattern);
  }

  /** Закрытие соединений */
  async close(): Promise<void> {
    await this.sub.quit();
    await this.pub.quit();
  }

  private matchPattern(pattern: string, channel: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^.]+').replace(/\./g, '\\.') + '$');
    return regex.test(channel);
  }
}
