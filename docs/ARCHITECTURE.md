# Архитектура системы EMDR-AI Therapy Assistant

## Содержание

1. [Обзор системы](#обзор-системы)
2. [Технологический стек](#технологический-стек)
3. [Структура проекта](#структура-проекта)
4. [Компоненты системы](#компоненты-системы)
5. [WebRTC-архитектура](#webrtc-архитектура)
6. [Безопасность](#безопасность)

## Обзор системы

EMDR-AI Therapy Assistant — многослойная система для виртуальной EMDR-терапии с ИИ. Построена на принципах модульности и privacy-first.

### Ключевые архитектурные решения

- **Privacy-First**: Обработка эмоциональных данных через TensorFlow.js в браузере
- **Модульная архитектура**: Независимые пакеты и сервисы
- **Next.js App Router**: Серверный рендеринг и маршрутизация
- **LiveKit WebRTC**: Real-time аудио/видео коммуникация

## Технологический стек

### Frontend
```
Framework:    Next.js 13 App Router + React 18
Language:     TypeScript 5.1, ESM
UI:           Tailwind CSS, Framer Motion
3D:           Three.js + @react-three/fiber + @react-three/drei
Audio:        Tone.js + Web Audio API
Emotion:      TensorFlow.js (custom models)
WebRTC:       LiveKit Client SDK
```

### Backend
```
API:          NestJS (services/api, port 8000)
Orchestrator: NestJS (services/orchestrator, port 8002)
Database:     PostgreSQL 15+
Cache:        Redis 7+
ORM:          Prisma
Auth:         JWT + Passport
WebRTC:       LiveKit Server
```

### Infrastructure
```
Containers:   Docker Compose
CI/CD:        GitHub Actions
Deploy:       Vercel (frontend), Docker (services)
Monitoring:   Prometheus + Grafana
Storage:      MinIO (S3-compatible)
```

## Структура проекта

```
emdr42/
├── app/                           # Next.js App Router (17 pages)
│   ├── layout.tsx                 # Root layout
│   ├── providers.tsx              # Client-side providers
│   ├── globals.css                # Tailwind globals
│   ├── page.tsx                   # Home
│   ├── about/page.tsx             # About EMDR
│   ├── login/page.tsx             # Login
│   ├── register/page.tsx          # Registration
│   ├── session/                   # EMDR session (Three.js canvas)
│   │   ├── page.tsx
│   │   └── SessionCanvas.tsx
│   └── (protected)/               # Auth-required pages
│       ├── layout.tsx             # Sidebar + auth check
│       ├── admin/page.tsx         # Admin panel
│       ├── dashboard/page.tsx     # Dashboard
│       ├── patients/page.tsx      # Patient management
│       ├── progress/page.tsx      # Progress tracking
│       └── settings/page.tsx      # Settings
│
├── packages/
│   ├── core/                      # @emdr42/core — shared business logic
│   │   └── src/
│   │       ├── patterns/          # EMDR movement patterns
│   │       └── services/          # Audio, emotion services
│   ├── emdr-engine/               # @emdr42/emdr-engine — EMDR protocol engine
│   ├── ai-providers/              # @emdr42/ai-providers — LLM/TTS/STT integrations
│   └── livekit-integration/       # @emdr42/livekit — LiveKit client/server utils
│       └── src/
│           ├── client.ts          # Room connection, track publishing
│           ├── server.ts          # Token generation
│           └── index.ts
│
├── services/
│   ├── api/                       # NestJS backend API (port 8000)
│   │   └── src/
│   │       ├── auth/              # JWT auth, guards, decorators
│   │       ├── users/             # User management
│   │       ├── sessions/          # Therapy sessions
│   │       ├── admin/             # Admin endpoints
│   │       ├── health/            # Health checks
│   │       ├── livekit/           # LiveKit token endpoint
│   │       └── prisma/            # Prisma ORM
│   └── orchestrator/              # Session Orchestrator (port 8002)
│
├── contexts/                      # React Context providers
│   ├── AuthContext.tsx
│   ├── EmotionContext.tsx
│   └── TherapyContext.tsx
│
├── monitoring/
│   └── prometheus.yml             # Prometheus scrape config
│
├── docs/                          # ROADMAP, WHITEPAPER, ARCHITECTURE
├── .github/workflows/             # CI/CD workflows
├── docker-compose.yml             # Full dev environment
├── next.config.js                 # Security headers, standalone output
└── vercel.json                    # Vercel deployment config
```

## Компоненты системы

### Frontend (Next.js App Router)

9 route groups, 17 pages. Использует App Router с серверными и клиентскими компонентами, React Context для state management, Three.js для 3D-визуализации EMDR-паттернов.

### Backend API (NestJS)

REST API на NestJS с модулями:
- **AuthModule** — JWT аутентификация, guards, decorators
- **UsersModule** — управление пользователями
- **SessionsModule** — EMDR-сессии
- **AdminModule** — администрирование
- **HealthModule** — health checks
- **LiveKitModule** — генерация LiveKit токенов

### Session Orchestrator

WebSocket-сервис для real-time управления терапевтическими сессиями. Координирует AI-провайдеры (LLM, TTS, STT), EMDR-движок и эмоциональный анализ.

### Packages

| Package | Назначение |
|---------|-----------|
| `@emdr42/core` | Shared бизнес-логика, EMDR-паттерны, audio/ASMR |
| `@emdr42/emdr-engine` | Протокол EMDR, управление BLS |
| `@emdr42/ai-providers` | Интеграции LLM, TTS, STT (Anthropic, OpenAI, Deepgram, ElevenLabs) |
| `@emdr42/livekit` | LiveKit клиент/сервер утилиты, токены |

## WebRTC-архитектура

```
[Next.js клиент]
  │ WebRTC (audio+video) via LiveKit
  ▼
[LiveKit медиасервер (port 7880)]
  │ ● аудио клиента → STT (Deepgram/faster-whisper)
  │ ● видео клиента → TensorFlow.js emotion recognition
  │ ● аудио от TTS → клиенту
  │ ● видео BLS → клиенту
  ▲
[Backend AI-сервисы]
  ├── API (NestJS, port 8000)
  ├── Session Orchestrator (port 8002)
  ├── AI Providers (LLM, TTS, STT)
  └── EMDR Engine (BLS patterns)
```

### Docker Compose Services

| Service | Image/Build | Port |
|---------|-------------|------|
| frontend | ./Dockerfile | 3000 |
| api | ./services/api | 8000 |
| orchestrator | ./services/orchestrator | 8002 |
| postgres | postgres:15-alpine | 5432 |
| redis | redis:7-alpine | 6379 |
| livekit | livekit/livekit-server | 7880, 7881, 7882/udp |
| minio | minio/minio | 9000, 9001 |
| prometheus | prom/prometheus | 9090 |
| grafana | grafana/grafana | 3001 |

## Безопасность

### Security Headers (next.config.js)
- Permissions-Policy (camera self only)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

### Аутентификация
- JWT tokens с Passport.js
- Role-based access control (guards)
- Protected routes в App Router

### Данные
- PostgreSQL с Prisma ORM
- Redis для сессий и кэширования
- Шифрование sensitive данных

---

**Версия**: 2.0
**Обновлено**: Апрель 2026
**Статус**: В активной разработке
