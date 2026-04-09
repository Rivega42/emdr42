# CLAUDE.md

Поведенческие и проектные гайдлайны для работы с EMDR-AI Therapy Assistant.

---

## Принципы разработки (Karpathy Guidelines)

**Компромисс:** Эти принципы смещены в сторону осторожности, а не скорости. Для тривиальных задач используй здравый смысл.

### 1. Думай перед кодом

**Не предполагай. Не скрывай путаницу. Озвучивай компромиссы.**

- Явно формулируй свои допущения. Если не уверен — спроси.
- Если есть несколько интерпретаций — представь их все, не выбирай молча.
- Если есть более простой подход — скажи об этом. Возражай, когда это обосновано.
- Если что-то неясно — остановись. Назови, что именно непонятно. Спроси.

### 2. Простота прежде всего

**Минимум кода, который решает задачу. Ничего спекулятивного.**

- Никаких фич сверх запрошенного.
- Никаких абстракций для одноразового кода.
- Никакой «гибкости» или «конфигурируемости», которую не просили.
- Никакой обработки ошибок для невозможных сценариев.
- Если написал 200 строк, а можно 50 — перепиши.

Тест: «Сказал бы senior-инженер, что это переусложнено?» Если да — упрощай.

### 3. Хирургические изменения

**Трогай только то, что нужно. Убирай только свой мусор.**

При редактировании существующего кода:
- Не «улучшай» соседний код, комментарии или форматирование.
- Не рефактори то, что не сломано.
- Следуй существующему стилю, даже если сделал бы иначе.
- Если замечаешь несвязанный мёртвый код — упомяни его, но не удаляй.

Когда твои изменения создают «сирот»:
- Удаляй импорты/переменные/функции, которые ТВОИ изменения сделали неиспользуемыми.
- Не удаляй ранее существовавший мёртвый код без просьбы.

Тест: Каждая изменённая строка должна прослеживаться напрямую к запросу пользователя.

### 4. Целевое исполнение

**Определи критерии успеха. Итерируй до верификации.**

Трансформируй задачи в проверяемые цели:
- «Добавь валидацию» -> «Напиши тесты для невалидных данных, затем сделай чтобы они проходили»
- «Почини баг» -> «Напиши тест, воспроизводящий баг, затем исправь»
- «Рефакторинг X» -> «Убедись, что тесты проходят до и после»

Для многошаговых задач — краткий план:
```
1. [Шаг] -> верификация: [проверка]
2. [Шаг] -> верификация: [проверка]
3. [Шаг] -> верификация: [проверка]
```

---

## О проекте

**EMDR-AI Therapy Assistant** — платформа виртуальной терапии с использованием ИИ и распознавания эмоций.

Текущее состояние: активная разработка. Это рабочая база, а не финальный продукт. Часть кода адаптирована под новую структуру, часть ещё требует чистки и MVP-фильтрации.

---

## Технологический стек

| Слой | Стек |
|------|------|
| Framework | Next.js 13 + React 18 |
| Language | TypeScript 5.1, ESM |
| UI | MUI 5, Tailwind CSS, Framer Motion |
| 3D | Three.js + @react-three/fiber |
| State | Redux Toolkit |
| AI/ML | TensorFlow.js |
| Audio | Tone.js |
| Realtime | Socket.io |
| Testing | Jest + @testing-library/react |
| Linting | ESLint + Prettier |
| Infra | Docker Compose, Nginx, Vercel |
| DB | PostgreSQL 15+ |
| Cache | Redis 7+ |

---

## Структура проекта

```
emdr42/
├── app/                 # Next.js app directory (layout, pages)
├── apps/
│   └── web/             # Frontend web app (Vite + React)
├── components/          # Переиспользуемые React-компоненты
├── packages/
│   └── core/            # Shared бизнес-логика
├── src/
│   └── ml-service/      # ML сервис
├── docs/                # Документация (ROADMAP, WHITEPAPER, ARCHITECTURE)
├── .github/
│   └── workflows/       # CI/CD (ci, codeql, docker, release)
├── docker-compose.yml   # Dev-окружение: frontend, backend, ML, PG, Redis, MinIO, Prometheus, Grafana
├── next.config.js       # Security headers, env vars
└── vercel.json          # Деплой на Vercel
```

---

## Стандарты кода

### Git-воркфлоу

Ветки:
```
feature/описание-номер-issue
fix/описание-номер-issue
docs/описание-номер-issue
```

Коммиты — Conventional Commits:
```
feat(scope): описание
fix(scope): описание
docs(scope): описание
style(scope): описание
refactor(scope): описание
test(scope): описание
chore(scope): описание
```

### TypeScript

- Строгая типизация, явные интерфейсы для пропсов компонентов.
- Стрелочные функции для утилит, именованные экспорты.
- Не использовать `any` без крайней необходимости.

```typescript
// Правильно
export const calculateEmotionScore = (
  emotions: EmotionData[]
): number => {
  if (!emotions.length) return 0;
  return emotions.reduce((sum, e) => sum + e.value, 0) / emotions.length;
};
```

### React-компоненты

- Функциональные компоненты с `FC<Props>`.
- Интерфейс пропсов рядом с компонентом.
- Доступность: `aria-label`, семантические теги.

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}) => (
  <button
    className={cn('button', `button--${variant}`)}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    {label}
  </button>
);
```

### CSS

- BEM-подобная нотация для кастомных стилей.
- CSS-переменные для цветов и spacing.
- Tailwind — для быстрой разметки в `apps/web`.

---

## Тестирование

```bash
npm test              # Unit-тесты (Jest)
npm run test:watch    # Watch-режим
npm run test:coverage # Покрытие
npm run test:e2e      # E2E (Cypress)
```

- При исправлении бага — сначала тест, воспроизводящий проблему, потом фикс.
- При добавлении фичи — тесты для основного сценария и edge cases.

---

## Команды

```bash
npm run dev           # Запуск dev-сервера
npm run build         # Production build
npm run lint          # ESLint
npm run format        # Prettier
npm run type-check    # TypeScript проверка типов
```

---

## Окружение

Требования: Node.js 20+, PostgreSQL 15+, Redis 7+, Docker (опционально).

Ключевые env-переменные (см. `.env.example`):
- `DATABASE_URL` — PostgreSQL
- `REDIS_URL` — Redis
- `JWT_SECRET` — авторизация
- `MORPHCAST_LICENSE_KEY` — распознавание эмоций
- `NEXT_PUBLIC_APP_URL` — URL приложения
- `WEBSOCKET_URL` — WebSocket

Никогда не коммить `.env`, credentials, ключи API.

---

## Безопасность

- Security headers настроены в `next.config.js` (Permissions-Policy, X-Frame-Options, X-Content-Type-Options).
- Camera access ограничен `self` через Permissions-Policy.
- Не допускать XSS, SQL injection, command injection.
- Валидация на границах системы (пользовательский ввод, внешние API).

---

## Принципы из GrandHub

Этот проект разделяет подходы monorepo-архитектуры GrandHub:

- **Чистая архитектура** — код строится как новая система, а не обрастает костылями поверх старого.
- **Миграционный mindset** — при переносе функционала критически оцениваем, нужен ли он в новом виде.
- **MVP-фильтрация** — в кодовую базу попадает только то, что нужно для текущего этапа.
- **Модульность** — `apps/`, `packages/`, `src/` чётко разделяют frontend, shared-логику и сервисы.
- **Канонические модули** — если в коде или документации встречаются устаревшие названия (`api-v3`, `legacy services`) — они не описывают текущую структуру.
