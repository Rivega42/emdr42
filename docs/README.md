# Карта документации EMDR-AI

> **Источники правды:** GitHub Project v2 (статус задач), Issues (содержание), `STATE.md` (срез сейчас), `ROADMAP.md` (план).

## Корневые документы

| Файл | Назначение |
|---|---|
| [`../README.md`](../README.md) | Overview, quick start |
| [`../CLAUDE.md`](../CLAUDE.md) | Гайдлайны для Claude Code (поведенческие + проектные) |
| [`../STATE.md`](../STATE.md) | Срез состояния проекта сейчас |
| [`../DECISIONS.md`](../DECISIONS.md) | Архитектурный decision log (краткие записи) |
| [`../ROADMAP.md`](../ROADMAP.md) | Квартальный план + видение |
| [`../BACKLOG.md`](../BACKLOG.md) | Бэклог |
| [`../CHANGELOG.md`](../CHANGELOG.md) | История релизов |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Правила вклада |
| [`../SECURITY.md`](../SECURITY.md) | Политика безопасности и repsponsible disclosure |
| [`../AUDIT.md`](../AUDIT.md) | Аудит репо (`REPO_SETUP_PROMPT.md`) |

## Структура `docs/`

### `adr/` — Architectural Decision Records
Полноразмерные ADR в формате `NNNN-title.md`. Лёгкие записи — в [`../DECISIONS.md`](../DECISIONS.md).

### `architecture/`
Диаграммы и описания подсистем (Three.js рендер, EMDR engine, AI pipeline, voice loop, safety monitor, billing).

### `api/`
OpenAPI / эндпоинт-референсы, контракт WebSocket-событий оркестратора.

### `runbooks/`
Операционные сценарии: incident response, backup/restore, deploy, on-call.

### `guides/`
How-to для разработчиков и терапевтов.

### `ai/` — правила для AI-исполнителей
| Файл | Кому |
|---|---|
| [`ai/CLAUDE_CODE_RULES.md`](ai/CLAUDE_CODE_RULES.md) | Claude Code (этот агент) |
| [`ai/CLAUDE_DESIGN_RULES.md`](ai/CLAUDE_DESIGN_RULES.md) | Claude в дизайн-задачах |
| [`ai/VIKA_RULES.md`](ai/VIKA_RULES.md) | Вика — внешний DevOps-помощник |
| [`ai/DEVOPS_RULES.md`](ai/DEVOPS_RULES.md) | Любой DevOps-агент или человек |
| [`ai/EXTERNAL_TASKS.md`](ai/EXTERNAL_TASKS.md) | Шаблон передачи задачи во внешний канал |
| [`ai/AUTOMATION.md`](ai/AUTOMATION.md) | Автоматизация GitHub (workflows + scripts) |

### `context/` — бизнес-контекст для AI
| Файл | О чём |
|---|---|
| [`context/PRODUCT_CONTEXT.md`](context/PRODUCT_CONTEXT.md) | Продуктовое видение, аудитория, метрики |
| [`context/DOMAIN.md`](context/DOMAIN.md) | EMDR-домен, терапевтические протоколы, термины |

### `prompts/` — системные промпты как код
Все системные промпты для LLM-вызовов (EMDR-фасилитатор, crisis triage, RDI guide) хранятся как `.md` с версией.

### [`GLOSSARY.md`](GLOSSARY.md)
Единый глоссарий терминов: EMDR-протокол, технические сокращения, бизнес-понятия.

## Как искать

- «Как развернуть прод?» → `runbooks/deploy.md` (создаётся в ШАГЕ 7) + [`../docs/RUNBOOK.md`](RUNBOOK.md).
- «Что делать при инциденте?» → [`../docs/INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).
- «Какой статус задачи?» → GitHub Project v2 (после ШАГА 8).
- «Почему мы выбрали X?» → [`../DECISIONS.md`](../DECISIONS.md) → если нужна развёрнутая мотивировка → `adr/NNNN-x.md`.
- «Что такое VOC / SUDS / RDI?» → [`GLOSSARY.md`](GLOSSARY.md) и [`context/DOMAIN.md`](context/DOMAIN.md).
