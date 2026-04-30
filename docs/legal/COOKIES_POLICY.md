# Cookies Policy — DRAFT v0.1

**⚠️ DRAFT — требует юрист review.**

## Что такое cookies

Cookies — небольшие файлы, сохраняемые браузером для работы сайта.

## Какие cookies мы используем

| Тип | Название | Назначение | Срок |
|-----|----------|------------|------|
| Essential | `auth-token` (если cookie-based auth включён, #115) | Аутентификация | Session / 15min |
| Essential | `refresh-token` | Продление сессии | 7 дней |
| Essential | `csrf-token` | Защита от CSRF | Session |
| Functional | `ui-theme` | Выбранная тема (light/dark) | 1 год |
| Functional | `locale` | Выбранный язык | 1 год |
| Analytics | `_emdr_sid` | Session analytics (анонимизировано) | 30 минут |

## Third-party cookies

| Provider | Purpose |
|----------|---------|
| Stripe | Payment processing (на `/billing/*` страницах) |
| Sentry (если включено #87) | Error tracking |
| LiveKit | WebRTC session signaling |

**Мы НЕ используем:**
- Advertising cookies
- Social tracking pixels
- Third-party analytics (Google Analytics и т.п.)

## Согласие

При первом заходе вы видите cookie banner с опциями:
- **Accept all** — все cookies
- **Essential only** — только необходимые для работы сайта
- **Customize** — выбрать категории

Согласие сохраняется на 12 месяцев.

## Как управлять cookies

- В браузере: Settings → Privacy → Cookies (каждый браузер по-разному)
- В приложении: Settings → Privacy → Cookie Preferences

Блокировка essential cookies сделает приложение неработоспособным.

## Контакты

privacy@emdr42.com
