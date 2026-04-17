import { Global, Module } from '@nestjs/common';
import IORedis from 'ioredis';
import { REDIS_CLIENT } from '../guards/throttle.guard';

/**
 * Singleton Redis client для ThrottleGuard и будущих rate-limit / cache uses.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const url = process.env.REDIS_URL;
        if (!url) {
          // eslint-disable-next-line no-console
          console.warn(
            '[redis] REDIS_URL not set — ThrottleGuard will fall back to in-memory',
          );
          return undefined;
        }
        return new IORedis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
