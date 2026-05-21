# Глоссарий

> Единый словарь. Если используешь термин — проверь, что он здесь, и используй именно так. Новые — добавлять.

## EMDR-протокол

| Термин | Расшифровка | Значение |
|---|---|---|
| **EMDR** | Eye Movement Desensitization and Reprocessing | Психотерапевтический метод обработки травмы через билатеральную стимуляцию. |
| **BLS** | Bilateral Stimulation | Альтернирующая стимуляция левого/правого полушария: visual / audio / tactile. |
| **SUDS** | Subjective Units of Distress Scale | Шкала 0–10, страдание при представлении target. |
| **VOC** | Validity of Cognition | Шкала 1–7, насколько Positive Cognition «правда». |
| **NC** | Negative Cognition | Иррациональное самоутверждение (например, «я бессилен»). |
| **PC** | Positive Cognition | Желаемое самоутверждение взамен NC («я в безопасности сейчас»). |
| **Target memory** | — | Травматическое воспоминание, с которым работаем. |
| **RDI** | Resource Development & Installation | Установка позитивных ресурсов до десенсибилизации. |
| **Safe place** | — | Воображаемое безопасное место, активируемое перед/после сессии. |
| **Body scan** | — | Сканирование тела на остаточное напряжение. |
| **Closure** | — | Завершение сессии, переход в spokойное состояние. |
| **Reevaluation** | — | На следующей сессии — проверка устойчивости результата. |

## Системные компоненты

| Термин | Что это |
|---|---|
| **Orchestrator** | NestJS-сервис на порту 8002, ведёт WebSocket-сессию: STT → LLM → TTS + BLS-команды клиенту. |
| **EMDR Engine** | `packages/emdr-engine/` — state machine 8 фаз + RDI, BLS-движок, SafetyMonitor. |
| **SafetyMonitor** | Композитный детектор диссоциации по emotion + voice метрикам. |
| **AI Providers** | `packages/ai-providers/` — обёртки над Anthropic/OpenAI/Ollama + circuit breaker + PII-redaction + prompt-armor. |
| **PatientContext** | Cross-session контекст пациента, передаётся в system prompt при старте новой сессии. |
| **Voice indicators** | hesitation, emotionalActivation, flatAffect, rushedSpeech — фичи из Vosk word-level timings. |
| **Crisis pipeline** | Eskalация при suicidal/panic indicators → CrisisService → notify therapist → hotlines. |
| **Adaptive set length** | Длина BLS-сета (24–48 движений), выбирается по SUDS + voice + emotion. |

## Безопасность / compliance

| Термин | Что это |
|---|---|
| **PHI** | Protected Health Information (HIPAA) — любые health data + identifier. |
| **PII** | Personally Identifiable Information — имя, email, phone, address. |
| **BAA** | Business Associate Agreement — HIPAA-контракт с подрядчиком, обрабатывающим PHI. |
| **DPO** | Data Protection Officer (GDPR). |
| **SOC 2** | Стандарт безопасности SaaS, type II = непрерывный аудит. |
| **PITR** | Point-In-Time Recovery — восстановление БД на конкретный момент. |
| **DR drill** | Disaster Recovery drill — отработка восстановления. |

## Технические

| Термин | Что это |
|---|---|
| **MFA / TOTP** | Multi-Factor Auth / Time-based One-Time Password (RFC 6238). |
| **Backup code** | Резервный одноразовый код для MFA. |
| **STT / TTS** | Speech-To-Text / Text-To-Speech. |
| **LiveKit** | WebRTC SFU для медиа-треков (audio/video). |
| **Vosk / Deepgram** | STT провайдеры (free / commercial). |
| **Piper / ElevenLabs** | TTS провайдеры. |
| **Circuit breaker** | Паттерн: при N последовательных фейлах — открыть, не вызывать. |
| **Prompt injection armor** | Фильтр против попыток сменить системные инструкции через user input. |
| **Soft-delete** | `deletedAt` — отметка удаления без физического удаления (для retention/восстановления). |
| **Audit log** | Журнал изменений с actorId, action, resource, ip, ua, correlationId. |

## Roles

| Роль | Доступ |
|---|---|
| **PATIENT** | Свои сессии, прогресс, заметки `SHARED_WITH_PATIENT`, billing себя. |
| **THERAPIST** | + назначенные пациенты, их сессии, заметки всех видов, crisis-уведомления. |
| **ADMIN** | Полный доступ, платформенные настройки, метрики, биллинг любого пользователя. |

## Процесс / автоматизация

| Термин | Что это |
|---|---|
| **Issue** | GitHub Issue с YAML-формой и обязательными полями. |
| **Sub-issue** | Дочерний issue, через GitHub Sub-issues API. |
| **Epic** | Issue с лейблом `тип: эпик`, имеет sub-issues. |
| **Project v2** | GitHub Project с кастомными полями (Status, Priority, Sprint, …). |
| **Vika** | Внешний DevOps-помощник; задачи через `[devops:vika]`-issue. |
| **Rollup** | Каскадный прогресс эпиков из закрытия sub-issues (`rollup.mjs`). |
| **`statusValidate-issue`** | Workflow, проверяющий обязательные поля при создании issue. |

## Конвенции

| Термин | Значение |
|---|---|
| **Trunk-based** | Короткие feature-ветки, частый merge в main. |
| **Conventional Commits** | `type(scope): subject` — `feat(api): add /intake endpoint`. |
| **Semantic Versioning** | `MAJOR.MINOR.PATCH` (`v1.2.3`). |
| **ADR** | Architectural Decision Record, в `docs/adr/`. |
