import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { LiveKitModule } from './livekit/livekit.module';
import { EmailModule } from './email/email.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    AdminModule,
    HealthModule,
    LiveKitModule,
    EmailModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // CorrelationId должен идти ДО LoggerMiddleware, чтобы logger видел cid.
    consumer.apply(CorrelationIdMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
