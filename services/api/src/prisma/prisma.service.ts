import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createEncryptionMiddleware } from './encryption.middleware';

/**
 * Connection pool config (#123).
 *
 * Prisma читает параметры из connection string:
 *   postgresql://...?connection_limit=20&pool_timeout=10
 *
 * Если POSTGRES_CONNECTION_LIMIT установлена и URL не содержит query —
 * допишем параметры автоматически.
 */
const augmentDatabaseUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const defaults: Record<string, string> = {
      connection_limit: process.env.POSTGRES_CONNECTION_LIMIT ?? '20',
      pool_timeout: process.env.POSTGRES_POOL_TIMEOUT ?? '10',
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (!parsed.searchParams.has(k)) {
        parsed.searchParams.set(k, v);
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = augmentDatabaseUrl(process.env.DATABASE_URL);
    super({
      datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    // PrismaClient $on тип может отсутствовать у generate-независимых enum-ов
    (this as unknown as {
      $on: (event: string, cb: (e: { message: string }) => void) => void;
    }).$on('warn', (e) => this.logger.warn(e.message));
    (this as unknown as {
      $on: (event: string, cb: (e: { message: string }) => void) => void;
    }).$on('error', (e) => this.logger.error(e.message));

    // Шифрование PHI полей (HIPAA/GDPR, #58).
    // В production требуем явный ключ длиной >=32 байт — без него
    // данные пациентов пошли бы в БД в открытом виде.
    const encryptionKey = process.env.PHI_ENCRYPTION_KEY;
    if (process.env.NODE_ENV === 'production') {
      if (!encryptionKey || encryptionKey.length < 32) {
        throw new Error(
          'PHI_ENCRYPTION_KEY is missing or shorter than 32 chars. ' +
            'Refusing to start in production — PHI would be written as plaintext.',
        );
      }
      this.$use(createEncryptionMiddleware(encryptionKey));
    } else if (encryptionKey && encryptionKey.length >= 32) {
      this.$use(createEncryptionMiddleware(encryptionKey));
    } else {
      this.logger.warn(
        '[security] PHI_ENCRYPTION_KEY weak/missing — middleware disabled (dev only)',
      );
    }

    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
