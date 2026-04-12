# Инструкция по запуску EMDR-AI Therapy Assistant

## Требования к системе

- **Node.js**: версия 20.0 или выше
- **npm**: версия 9.0 или выше
- **Docker** и **Docker Compose**: для запуска всех сервисов
- **Git**: для клонирования репозитория

## Быстрый старт (Docker Compose)

Docker Compose -- основной способ запуска всех сервисов.

### Шаг 1: Клонирование и настройка

```bash
git clone https://github.com/Rivega42/emdr42.git
cd emdr42
cp .env.example .env
```

### Шаг 2: Настройка переменных окружения

Откройте `.env` и заполните необходимые ключи:

```bash
# Обязательные для AI-функций
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...

# Авторизация (обязательно сменить для production)
JWT_SECRET=change-this-to-a-random-secret-in-production

# Распознавание эмоций (опционально)
MORPHCAST_LICENSE_KEY=...
```

Остальные переменные (`DATABASE_URL`, `REDIS_URL`, URL приложения) уже настроены для работы с Docker Compose.

### Шаг 3: Запуск

```bash
docker-compose up -d
```

Дождитесь запуска всех сервисов (первый запуск может занять несколько минут для сборки образов).

### Шаг 4: Проверка

После запуска доступны:

| Сервис | URL | Описание |
|--------|-----|----------|
| Frontend | http://localhost:3000 | Next.js приложение |
| API | http://localhost:8000 | NestJS бэкенд |
| Orchestrator | http://localhost:8002 | WebSocket-сервер сессий |
| PostgreSQL | localhost:5432 | База данных |
| Redis | localhost:6379 | Кэш и очереди |
| MinIO Console | http://localhost:9001 | Хранилище файлов (login: emdr42/emdr42_secret) |

## Запуск для разработки (без Docker)

### Установка зависимостей

```bash
npm install
```

### Запуск инфраструктуры

PostgreSQL и Redis можно запустить отдельно через Docker:

```bash
docker-compose up -d postgres redis
```

### Запуск фронтенда

```bash
npm run dev
```

Сайт будет доступен на http://localhost:3000

### Запуск API

```bash
cd services/api
npm install
npm run dev
```

### Запуск оркестратора

```bash
cd services/orchestrator
npm install
npm run dev
```

## Доступные страницы

- **Главная**: http://localhost:3000/
- **О проекте**: http://localhost:3000/about
- **Сессия терапии**: http://localhost:3000/session
- **Вход**: http://localhost:3000/login
- **Регистрация**: http://localhost:3000/register
- **Личный кабинет**: http://localhost:3000/dashboard (требуется авторизация)
- **Прогресс**: http://localhost:3000/progress (требуется авторизация)
- **Настройки**: http://localhost:3000/settings (требуется авторизация)

## Команды

```bash
npm run dev           # Запуск dev-сервера (фронтенд)
npm run build         # Production build
npm run lint          # ESLint
npm run format        # Prettier
npm run type-check    # Проверка типов TypeScript
npm test              # Unit-тесты
```

## Остановка сервисов

```bash
docker-compose down          # Остановить все контейнеры
docker-compose down -v       # Остановить и удалить volumes (данные БД)
```

## Решение проблем

### Порт уже занят

```bash
# Проверить, что занимает порт
lsof -ti:3000 | xargs kill
lsof -ti:8000 | xargs kill
```

### Проблемы с пакетами @emdr42/*

```bash
cd packages/core && npm install && npm run build
cd packages/emdr-engine && npm install && npm run build
cd packages/ai-providers && npm install && npm run build
```

### Пересборка Docker-образов

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Полезные ссылки

- **Репозиторий**: [github.com/Rivega42/emdr42](https://github.com/Rivega42/emdr42)
- **Next.js**: [nextjs.org](https://nextjs.org/)
- **NestJS**: [nestjs.com](https://nestjs.com/)
- **Three.js**: [threejs.org](https://threejs.org/)
