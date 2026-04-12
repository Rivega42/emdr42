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
  timestamp?: string;
}

type EventHandler<T = any> = (event: DomainEvent<T>) => void | Promise<void>;

export class EventBus {
  private pub: Redis;
  private sub: Redis;
  private handlers = new Map<string, EventHandler[]>();

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);

    this.sub.on('pmessage', (_pattern, channel, message) => {
      const event: DomainEvent = JSON.parse(message);
      // Вызвать обработчики для всех совпадающих паттернов
      for (const [pattern, handlers] of this.handlers.entries()) {
        if (this.matchPattern(pattern, channel)) {
          handlers.forEach((h) => h(event));
        }
      }
    });
  }

  /** Публикация события */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const payload = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      correlationId: event.correlationId || crypto.randomUUID(),
    });
    await this.pub.publish(event.type, payload);
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
