import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttlSeconds: number;
}

export const Throttle = (limit: number, ttlSeconds: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttlSeconds } as ThrottleOptions);

interface RequestRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class ThrottleGuard implements CanActivate {
  private store = new Map<string, RequestRecord>();
  private defaultLimit = 100;
  private defaultTtl = 60;

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<ThrottleOptions>(
      THROTTLE_KEY,
      context.getHandler(),
    );

    const limit = options?.limit ?? this.defaultLimit;
    const ttl = options?.ttlSeconds ?? this.defaultTtl;

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.getKey(request, context);
    const now = Date.now();

    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + ttl * 1000 });
      return true;
    }

    if (record.count >= limit) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private getKey(request: Request, context: ExecutionContext): string {
    const ip =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      'unknown';
    const handler = context.getHandler().name;
    return `${ip}:${handler}`;
  }
}
