import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type IORedis from 'ioredis';
import { REDIS_CLIENT } from '../common/guards/throttle.guard';

/**
 * Revocation-метки для access-токенов (#119).
 *
 * Access JWT живёт 15 минут и не проверяется по БД. При logout-all /
 * password-reset выданные токены остаются валидными до истечения — в т.ч.
 * на открытых WebSocket-сессиях orchestrator.
 *
 * Решение: метка `auth:revoked:{userId} = <timestamp_ms>` в Redis с TTL =
 * времени жизни access-токена. Потребители (orchestrator) сравнивают iat
 * токена с меткой: iat < revokedAt → токен отозван.
 *
 * Без Redis (dev) — fail-open: токены доживают свои 15 минут.
 */
const REVOKED_KEY_PREFIX = 'auth:revoked:';
// TTL = max возраст access-токена (JWT_EXPIRES_IN default 15m) + запас.
const REVOKED_TTL_SEC = 16 * 60;

@Injectable()
export class TokenRevocationService {
  private readonly logger = new Logger(TokenRevocationService.name);

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: IORedis,
  ) {}

  /** Помечает все access-токены пользователя, выданные ДО этого момента, отозванными. */
  async revokeUserTokens(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(
        `${REVOKED_KEY_PREFIX}${userId}`,
        String(Date.now()),
        'EX',
        REVOKED_TTL_SEC,
      );
    } catch (err) {
      // Best-effort: сбой Redis не должен ломать logout/reset.
      this.logger.warn(`revokeUserTokens(${userId}) failed: ${err}`);
    }
  }
}
