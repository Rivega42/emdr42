/**
 * Job Queue — BullMQ очереди для гарантированной доставки задач.
 *
 * Использование:
 *   const queue = new JobQueue('emails', redisUrl);
 *   await queue.add('send-reset', { to: 'user@mail.com', token: '...' });
 *
 *   const worker = queue.createWorker(async (job) => {
 *     await sendEmail(job.data);
 *   });
 */

import { Queue, Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

export interface JobQueueOptions {
  redisUrl?: string;
  defaultRetries?: number;
  defaultBackoff?: number;
}

export class JobQueue<T = any> {
  private queue: Queue<T>;
  private connection: ConnectionOptions;

  constructor(name: string, options: JobQueueOptions = {}) {
    const { redisUrl = 'redis://localhost:6379', defaultRetries = 3, defaultBackoff = 1000 } = options;

    // Парсинг Redis URL в connection options
    const url = new URL(redisUrl);
    this.connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
    };

    this.queue = new Queue<T>(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: defaultRetries,
        backoff: { type: 'exponential', delay: defaultBackoff },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }

  /** Добавить задачу в очередь */
  async add(jobName: string, data: T, options?: { delay?: number; priority?: number }): Promise<string> {
    const job = await this.queue.add(jobName, data, options);
    return job.id ?? '';
  }

  /** Создать воркер для обработки задач */
  createWorker(handler: (job: Job<T>) => Promise<void>): Worker<T> {
    return new Worker<T>(this.queue.name, handler, {
      connection: this.connection,
      concurrency: 5,
    });
  }

  /** Закрытие очереди */
  async close(): Promise<void> {
    await this.queue.close();
  }
}
