import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import IORedis from 'ioredis';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttlSeconds: number;
}

export const Throttle = (limit: number, ttlSeconds: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttlSeconds } as ThrottleOptions);

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

interface BucketState {
  count: number;
  resetAt: number;
}

/**
 * ThrottleGuard (#118).
 *
 * Использует Redis (sharded rate-limiter) если REDIS_CLIENT инжектирован,
 * иначе fallback на in-memory Map (для dev / unit-тестов).
 *
 * Redis-backed — единый state для multi-instance deployment, устойчив к
 * распределению трафика.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly logger = new Logger(ThrottleGuard.name);
  private readonly defaultLimit = 100;
  private readonly defaultTtl = 60;
  private readonly inMemoryStore = new Map<string, BucketState>();

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: IORedis,
  ) {
    if (!this.redis) {
      this.logger.warn(
        'ThrottleGuard: no Redis client injected, falling back to in-memory (NOT suitable for multi-instance deployment)',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<ThrottleOptions>(
      THROTTLE_KEY,
      context.getHandler(),
    );

    const limit = options?.limit ?? this.defaultLimit;
    const ttl = options?.ttlSeconds ?? this.defaultTtl;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = this.getKey(req, context);

    const { allowed, remaining, resetAt } = this.redis
      ? await this.checkRedis(key, limit, ttl)
      : this.checkMemory(key, limit, ttl);

    // Стандартные rate-limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(remaining, 0));
    res.setHeader('X-RateLimit-Reset', Math.floor(resetAt / 1000));

    if (!allowed) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      res.setHeader('Retry-After', retryAfter);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async checkRedis(
    key: string,
    limit: number,
    ttl: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const redisKey = `rl:${key}`;

    // Atomic INCR + EXPIRE через pipeline
    const pipeline = this.redis!.multi();
    pipeline.incr(redisKey);
    pipeline.pttl(redisKey);
    const [[, countRaw], [, ttlRaw]] = (await pipeline.exec()) as [
      [unknown, number],
      [unknown, number],
    ];
    const count = Number(countRaw);
    let ttlMs = Number(ttlRaw);

    if (ttlMs < 0) {
      // Ключ без expiry — выставляем TTL
      await this.redis!.pexpire(redisKey, ttl * 1000);
      ttlMs = ttl * 1000;
    }

    const resetAt = Date.now() + ttlMs;
    const remaining = limit - count;
    return { allowed: count <= limit, remaining, resetAt };
  }

  private checkMemory(
    key: string,
    limit: number,
    ttl: number,
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.inMemoryStore.get(key);

    if (!record || now > record.resetAt) {
      const resetAt = now + ttl * 1000;
      this.inMemoryStore.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    record.count++;
    return {
      allowed: record.count <= limit,
      remaining: limit - record.count,
      resetAt: record.resetAt,
    };
  }

  private getKey(req: Request, context: ExecutionContext): string {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const user = (req as Request & { user?: { userId?: string } }).user
      ?.userId;
    const handler = context.getHandler().name;
    const controller = context.getClass().name;
    // Если есть user — rate-limit per user (не per IP), чтобы shared NAT не блокировал
    return user
      ? `${controller}:${handler}:u:${user}`
      : `${controller}:${handler}:ip:${ip}`;
  }
}
