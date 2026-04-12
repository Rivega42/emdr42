import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
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
  console.log(`EMDR42 API running on port ${port}`);
}

bootstrap();
