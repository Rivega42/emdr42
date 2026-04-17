/**
 * Job Queue — BullMQ очереди для гарантированной доставки задач (#134).
 *
 * Добавлено vs baseline:
 *   - DLQ — отдельная queue dlq-<name> куда уходят failed jobs после retries
 *   - Idempotency — Redis SET {queueName}:idempotency:{key} с TTL dedup
 *   - Optional priority + delay
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { ConnectionOptions, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

export interface JobQueueOptions {
  redisUrl?: string;
  defaultRetries?: number;
  defaultBackoff?: number;
  /** Используется для dedup через Redis SET */
  idempotencyTtlSeconds?: number;
}

export interface AddJobOptions {
  delay?: number;
  priority?: number;
  idempotencyKey?: string;
}

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

export class JobQueue<T = any> {
  private queue: Queue<T>;
  private dlq: Queue<T>;
  private queueEvents: QueueEvents;
  private redis: IORedis;
  private connection: ConnectionOptions;
  private readonly idempotencyTtl: number;
  private readonly queueName: string;

  constructor(name: string, options: JobQueueOptions = {}) {
    const {
      redisUrl = DEFAULT_REDIS_URL,
      defaultRetries = 3,
      defaultBackoff = 1000,
      idempotencyTtlSeconds = 24 * 60 * 60,
    } = options;

    this.queueName = name;
    this.idempotencyTtl = idempotencyTtlSeconds;

    const url = new URL(redisUrl);
    this.connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
    };

    this.redis = new IORedis({
      host: this.connection.host as string,
      port: this.connection.port as number,
      password: this.connection.password as string | undefined,
      maxRetriesPerRequest: null, // нужно BullMQ
    });

    this.queue = new Queue<T>(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: defaultRetries,
        backoff: { type: 'exponential', delay: defaultBackoff },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });

    this.dlq = new Queue<T>(`dlq-${name}`, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 1, // DLQ не ретраит
        removeOnComplete: false, // сохраняем для inspection
        removeOnFail: false,
      },
    });

    this.queueEvents = new QueueEvents(name, { connection: this.connection });

    // Failed → DLQ после всех retries
    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      try {
        const job = await this.queue.getJob(jobId);
        if (!job) return;
        const attemptsMade = job.attemptsMade ?? 0;
        const totalAttempts = job.opts.attempts ?? 1;
        if (attemptsMade >= totalAttempts) {
          await this.dlq.add(
            `dlq-${job.name}`,
            job.data,
            {
              removeOnComplete: false,
              removeOnFail: false,
              jobId: `dlq-${job.id}`,
            },
          );
          // eslint-disable-next-line no-console
          console.warn(
            `[jobQueue:${this.queueName}] job ${job.id} → DLQ after ${attemptsMade} attempts: ${failedReason}`,
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[jobQueue:${this.queueName}] DLQ routing failed:`, err);
      }
    });
  }

  /**
   * Добавить задачу в очередь (#134 idempotency).
   *
   * Если передан idempotencyKey — проверяем Redis SET;
   * при совпадении просто возвращаем existing jobId без повторной вставки.
   */
  async add(
    jobName: string,
    data: T,
    options: AddJobOptions = {},
  ): Promise<string> {
    if (options.idempotencyKey) {
      const redisKey = `${this.queueName}:idempotency:${options.idempotencyKey}`;
      const existing = await this.redis.get(redisKey);
      if (existing) return existing;

      const bullOpts: JobsOptions = {
        delay: options.delay,
        priority: options.priority,
        jobId: options.idempotencyKey,
      };
      const job = await this.queue.add(jobName, data, bullOpts);
      const jobId = job.id ?? '';
      await this.redis.set(redisKey, jobId, 'EX', this.idempotencyTtl);
      return jobId;
    }

    const job = await this.queue.add(jobName, data, {
      delay: options.delay,
      priority: options.priority,
    });
    return job.id ?? '';
  }

  createWorker(handler: (job: Job<T>) => Promise<void>, concurrency = 5): Worker<T> {
    return new Worker<T>(this.queueName, handler, {
      connection: this.connection,
      concurrency,
    });
  }

  /** Inspection: получить failed jobs из DLQ */
  async getDlqJobs(start = 0, end = 100) {
    return this.dlq.getJobs(['failed', 'completed', 'waiting'], start, end);
  }

  async getDlqCount(): Promise<number> {
    return this.dlq.count();
  }

  /** Re-enqueue job из DLQ обратно в основную очередь */
  async retryFromDlq(dlqJobId: string): Promise<void> {
    const job = await this.dlq.getJob(dlqJobId);
    if (!job) throw new Error(`DLQ job ${dlqJobId} not found`);
    await this.queue.add(job.name.replace(/^dlq-/, ''), job.data);
    await job.remove();
  }

  async close(): Promise<void> {
    await Promise.all([
      this.queue.close(),
      this.dlq.close(),
      this.queueEvents.close(),
    ]);
    await this.redis.quit();
  }
}
