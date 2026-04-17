import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { BillingModule } from './billing/billing.module';
import { MetricsModule } from './metrics/metrics.module';
import { PatientContextModule } from './patient-context/patient-context.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    MetricsModule,
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
    BillingModule,
    PatientContextModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // CorrelationId ДО LoggerMiddleware, чтобы logger видел cid.
    consumer.apply(CorrelationIdMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
