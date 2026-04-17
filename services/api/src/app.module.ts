import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { TherapistPatientModule } from './therapist-patient/therapist-patient.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { LiveKitModule } from './livekit/livekit.module';
import { EmailModule } from './email/email.module';
import { CrisisModule } from './crisis/crisis.module';
import { UsageModule } from './usage/usage.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { VerificationModule } from './verification/verification.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    TherapistPatientModule,
    AdminModule,
    HealthModule,
    LiveKitModule,
    EmailModule,
    CrisisModule,
    UsageModule,
    AnalyticsModule,
    VerificationModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // CorrelationId должен идти ДО LoggerMiddleware, чтобы logger видел cid.
    consumer.apply(CorrelationIdMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
