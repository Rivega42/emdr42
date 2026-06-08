import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RefreshTokenService } from '../auth/refresh-token.service';

/**
 * Внутренний scheduler для GDPR Art. 17 retention и refresh-token cleanup.
 *
 * Запускается ОДИН раз в сутки. Для multi-replica setup нужен leader-election
 * (Redis SET NX с TTL), иначе каждый pod выполнит job — это P1, см.
 * docs/PRODUCTION_LAUNCH_PLAN.md sprint 4.
 *
 * Использован setInterval вместо @nestjs/schedule, чтобы избежать новой
 * зависимости и upgrade-обязательств. Если позже подключим Bull/BullMQ —
 * перенесём логику туда.
 */
@Injectable()
export class RetentionScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 24 * 60 * 60 * 1000; // 24h

  constructor(
    private readonly users: UsersService,
    private readonly refresh: RefreshTokenService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.DISABLE_RETENTION_SCHEDULER === '1') {
      this.logger.warn('Retention scheduler disabled by env');
      return;
    }
    // Первый запуск с небольшим jitter, чтобы при сразу нескольких pod-ах
    // (если оператор пропустил leader-election) не было полного pile-up.
    const initialDelay = 5 * 60 * 1000 + Math.floor(Math.random() * 60_000);
    setTimeout(() => {
      void this.runOnce();
      this.timer = setInterval(() => void this.runOnce(), this.intervalMs);
      this.timer.unref?.();
    }, initialDelay);
    this.logger.log(
      `Retention scheduler armed (initial in ${Math.round(initialDelay / 60000)} min, then every 24h)`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runOnce(): Promise<void> {
    this.logger.log('Running retention + refresh cleanup');
    try {
      await this.users.runRetentionJob();
    } catch (err) {
      this.logger.error('Retention job failed', err as Error);
    }
    try {
      await this.refresh.cleanup();
    } catch (err) {
      this.logger.error('Refresh cleanup failed', err as Error);
    }
  }
}
