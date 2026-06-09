/**
 * Проверка revocation-меток access-токенов (#119).
 *
 * API при logout-all / password-reset пишет `auth:revoked:{userId} = <ts_ms>`
 * в Redis (TTL = времени жизни access-токена). JWT проверяется только на
 * WS-handshake — без этой проверки отозванный токен продолжал бы управлять
 * EMDR-сессией до 15 минут.
 *
 * Кэш 5 секунд per-userId — не ходим в Redis на каждый event.
 * Без Redis (dev) — fail-open.
 */
import type Redis from 'ioredis';

const REVOKED_KEY_PREFIX = 'auth:revoked:';
const DEFAULT_CACHE_TTL_MS = 5_000;

interface CacheEntry {
  revokedAtMs: number | null;
  checkedAt: number;
}

export class RevocationChecker {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly redis: Redis | null,
    private readonly cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  ) {}

  /**
   * true — токен с данным iat (секунды, из JWT) отозван для userId.
   */
  async isRevoked(userId: string, tokenIatSec: number | undefined): Promise<boolean> {
    if (!this.redis || !tokenIatSec) return false;

    const now = Date.now();
    let entry = this.cache.get(userId);
    if (!entry || now - entry.checkedAt > this.cacheTtlMs) {
      let revokedAtMs: number | null = null;
      try {
        const raw = await this.redis.get(`${REVOKED_KEY_PREFIX}${userId}`);
        revokedAtMs = raw ? Number(raw) : null;
        if (revokedAtMs !== null && Number.isNaN(revokedAtMs)) revokedAtMs = null;
      } catch {
        // Redis недоступен — fail-open, не рвём живую терапевтическую сессию.
        revokedAtMs = null;
      }
      entry = { revokedAtMs, checkedAt: now };
      this.cache.set(userId, entry);
    }

    if (entry.revokedAtMs === null) return false;
    // iat в секундах; метка в ms. Токен выдан ДО revocation → отозван.
    return tokenIatSec * 1000 < entry.revokedAtMs;
  }

  /** Для тестов / периодической чистки. */
  clearCache(): void {
    this.cache.clear();
  }
}
