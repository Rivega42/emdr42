<<<<<<< HEAD
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { LiveKitModule } from './livekit/livekit.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    AdminModule,
    HealthModule,
    LiveKitModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
=======
import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [EmailModule, AuthModule, UsersModule],
})
export class AppModule {}
>>>>>>> origin/feature/i18n-email-gdpr
