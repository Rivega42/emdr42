import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createEncryptionMiddleware } from './encryption.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Шифрование PHI полей (HIPAA/GDPR)
    const encryptionKey = process.env.PHI_ENCRYPTION_KEY;
    if (encryptionKey) {
      this.$use(createEncryptionMiddleware(encryptionKey));
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
