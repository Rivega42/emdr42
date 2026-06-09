import { RevocationChecker } from '../revocation';
import type Redis from 'ioredis';

const makeRedis = (value: string | null) =>
  ({ get: jest.fn().mockResolvedValue(value) } as unknown as Redis);

describe('RevocationChecker (#119)', () => {
  const nowSec = Math.floor(Date.now() / 1000);

  it('fail-open без Redis', async () => {
    const checker = new RevocationChecker(null);
    expect(await checker.isRevoked('u1', nowSec)).toBe(false);
  });

  it('fail-open без iat в токене', async () => {
    const checker = new RevocationChecker(makeRedis(String(Date.now())));
    expect(await checker.isRevoked('u1', undefined)).toBe(false);
  });

  it('токен, выданный ДО revocation — отозван', async () => {
    const revokedAtMs = Date.now();
    const issuedBefore = Math.floor((revokedAtMs - 60_000) / 1000);
    const checker = new RevocationChecker(makeRedis(String(revokedAtMs)));
    expect(await checker.isRevoked('u1', issuedBefore)).toBe(true);
  });

  it('токен, выданный ПОСЛЕ revocation (re-login) — валиден', async () => {
    const revokedAtMs = Date.now() - 60_000;
    const issuedAfter = Math.floor(Date.now() / 1000);
    const checker = new RevocationChecker(makeRedis(String(revokedAtMs)));
    expect(await checker.isRevoked('u1', issuedAfter)).toBe(false);
  });

  it('нет метки — не отозван', async () => {
    const checker = new RevocationChecker(makeRedis(null));
    expect(await checker.isRevoked('u1', nowSec)).toBe(false);
  });

  it('кэширует результат на cacheTtl (один Redis-запрос)', async () => {
    const redis = makeRedis(null);
    const checker = new RevocationChecker(redis, 5_000);
    await checker.isRevoked('u1', nowSec);
    await checker.isRevoked('u1', nowSec);
    await checker.isRevoked('u1', nowSec);
    expect((redis.get as jest.Mock).mock.calls.length).toBe(1);
  });

  it('после истечения кэша ходит в Redis заново', async () => {
    const redis = makeRedis(null);
    const checker = new RevocationChecker(redis, 1); // 1ms TTL
    await checker.isRevoked('u1', nowSec);
    await new Promise((r) => setTimeout(r, 5));
    await checker.isRevoked('u1', nowSec);
    expect((redis.get as jest.Mock).mock.calls.length).toBe(2);
  });

  it('fail-open при ошибке Redis', async () => {
    const redis = {
      get: jest.fn().mockRejectedValue(new Error('redis down')),
    } as unknown as Redis;
    const checker = new RevocationChecker(redis);
    expect(await checker.isRevoked('u1', nowSec)).toBe(false);
  });
});
