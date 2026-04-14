import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { appRouter } from './trpc';
import type { TrpcContext } from './trpc/trpc';
import { AuthService } from './auth/auth.service';
import { SessionsService } from './sessions/sessions.service';
import { UsersService } from './users/users.service';
import { AdminService } from './admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';

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

  // Swagger
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
    swaggerOptions: { persistAuthorization: true },
  });

  // Mount tRPC
  const authService = app.get(AuthService);
  const sessionsService = app.get(SessionsService);
  const usersService = app.get(UsersService);
  const adminService = app.get(AdminService);
  const jwtService = app.get(JwtService);
  const prisma = app.get(PrismaService);

  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req }): Promise<TrpcContext> => {
        let user: TrpcContext['user'];
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.slice(7);
            const payload = jwtService.verify(token) as { sub: string; role: string };
            const dbUser = await prisma.user.findUnique({
              where: { id: payload.sub },
              select: { id: true, email: true, role: true, isActive: true },
            });
            if (dbUser?.isActive) {
              user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };
            }
          } catch {
            // Invalid token — user stays undefined
          }
        }
        return { req, user, authService, sessionsService, usersService, adminService };
      },
    }),
  );

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`EMDR42 API running on port ${port}`);
}

bootstrap();
