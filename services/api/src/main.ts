import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { PinoLoggerService } from './common/logger/pino-logger';
import { initSentry } from './common/sentry/sentry';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const helmet = require('helmet');

async function bootstrap() {
  // Sentry обязательно до NestFactory для capture startup errors (#87)
  initSentry();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // rawBody нужен для Stripe webhook подписи (#145)
    rawBody: true,
    // Pino logger для structured JSON logs (#88)
    logger: new PinoLoggerService('App'),
  });

  // Graceful shutdown (#124) — обязательно до listen
  app.enableShutdownHooks();

  // Security headers (#115)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", 'blob:'],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // ломает WebRTC / LiveKit
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      xssFilter: true,
      frameguard: { action: 'deny' },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-CSRF-Token'],
    exposedHeaders: ['X-Correlation-Id'],
    maxAge: 86400,
  });

  // SanitizePipe ДО ValidationPipe — сначала чистим XSS, потом валидируем
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('EMDR42 API')
    .setDescription('Backend API for EMDR-AI Therapy Assistant')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Аутентификация и регистрация')
    .addTag('sessions', 'Терапевтические EMDR-сессии')
    .addTag('users', 'Управление пользователями и GDPR')
    .addTag('admin', 'Администрирование платформы')
    .addTag('health', 'Проверка здоровья сервиса')
    .addTag('livekit', 'WebRTC токены (LiveKit)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`EMDR42 API running on port ${port}`);

  // Дополнительная страховка для SIGTERM поверх enableShutdownHooks()
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      logger.log(`Received ${signal}, shutting down...`);
      app
        .close()
        .then(() => {
          logger.log('HTTP server closed');
          process.exit(0);
        })
        .catch((err) => {
          logger.error(`Error during shutdown: ${err}`);
          process.exit(1);
        });
      setTimeout(() => {
        logger.warn('Force exit after shutdown timeout');
        process.exit(1);
      }, 15000).unref();
    });
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] Bootstrap failed:', err);
  process.exit(1);
});
