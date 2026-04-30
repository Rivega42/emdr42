# Состояние проекта

**Дата обновления:** 2026-04-30
**Версия:** 0.1.0 (pre-release, активная разработка)
**Стадия:** MVP-готовность 60–85% по подсистемам; идёт настройка операционной инфраструктуры

> **Источники правды:** `ROADMAP.md` (квартальный план), `BACKLOG.md` (бэклог), GitHub Issues + Project (после ШАГА 8). Этот файл — короткий «срез сейчас», обновляется в начале и конце каждой рабочей сессии.

## В работе сейчас

- **`chore/repo-setup`** (ветка) — ✅ выполнены 10 шагов `REPO_SETUP_PROMPT.md`. Готова к PR в `main`.
- **`claude/project-review-issues-En09l`** — основные продуктовые правки последних 60+ коммитов (core EMDR loop, security hardening, E2E smoke, billing/MFA/crisis интеграции). Готова к review/merge в `main`.

## Заблокировано

- **#136 (K8s deploy)**, **#137 (backups)**, **#138 (Loki/Grafana)**, **#87 (Sentry DSN)**, **#145 (Stripe ключи)**, **#146 (legal/BAA)**, **#148 (SMTP)**, **#149 (Twilio)** — ждут Вику или founders. Промты в комментариях issues.
- **#113 (Prisma migrations init)** — ждёт первого `prisma migrate dev --name init` + Dockerfile-интеграции.

## Известные проблемы

- Существующие markdown-шаблоны issues (`bug_report.md`, `feature_request.md`) будут заменены на YAML-формы из repo-setup-kit на ШАГЕ 6.
- `gitleaks` не установлен в окружении — полный скан истории отдан в Vika-issue (P1) на ШАГЕ 10.
- Нет `CODEOWNERS` — будет создан на ШАГЕ 10 после уточнения состава команды.

## Следующие шаги (по `REPO_SETUP_PROMPT.md`)

1. ✅ ШАГ 1 — `AUDIT.md`
2. ✅ ШАГ 2 — `STATE.md`, `DECISIONS.md`, `CHANGELOG.md`, `.gitattributes`
3. ✅ ШАГ 3 — структура `docs/{adr,architecture,api,runbooks,guides,ai,prompts,context}`, `infra/`, `tools/dashboard/`, `_archive/`
4. ✅ ШАГ 4 — `docs/ai/{CLAUDE_CODE_RULES,CLAUDE_DESIGN_RULES,VIKA_RULES,DEVOPS_RULES,EXTERNAL_TASKS,AUTOMATION}.md`
5. ✅ ШАГ 5 — `docs/context/{PRODUCT_CONTEXT,DOMAIN}.md`, `docs/GLOSSARY.md`, `docs/prompts/`
6. ✅ ШАГ 6 — лейблы (`scripts/setup-labels.sh`) + 6 YAML issue-форм + PR-template
7. ✅ ШАГ 7 — `labeler.yml` + `deploy-staging.yml` + `deploy-prod.yml` (адаптированы под pnpm)
8. ✅ ШАГ 8 — 8 automation-workflow + 9 mjs-скриптов + `setup-project.sh`
9. ✅ ШАГ 9 — `tools/dashboard/` (Vite+React+Tailwind) + `dashboard-fetch.mjs` + `dashboard-sync.yml`
10. ✅ ШАГ 10 — Vika-issues + META-issues + push + PR (см. ниже)

## Созданные issues (ШАГ 10)

| # | Тип | Тема |
|---|---|---|
| #152 | `[devops:vika]` | Применить лейблы из setup-labels.sh |
| #153 | `[devops:vika]` | Создать GitHub Project v2 + поля |
| #154 | `[devops:vika]` | Branch protection для main |
| #155 | `[devops:vika]` | GitHub Environments staging + production |
| #156 | `[devops:vika]` | Включить GitHub Pages для дашборда |
| #157 | `[devops:vika]` | Включить GitHub Security Features |
| #158 | `[devops:vika]` | Полный gitleaks scan истории |
| #159 | `[META]` | Финальный обход — вопросы founders (license, branches, CODEOWNERS, Telegram, URLs, team) |
| #160 | `feature` | Приглашение пациента по ссылке (запрос пользователя) |
| #161 | `feature` | Приём заявок с маркетинг-сайта → воронка лид→клиент (запрос пользователя) |

## Метрики MVP-готовности (на 2026-04-30)

| Подсистема | % | Что осталось |
|---|---|---|
| Core EMDR loop (voice + adapt + safety) | 85% | E2E на реальном LiveKit |
| Auth + MFA | 90% | E2E на TOTP/backup-flow |
| Billing (Stripe) | 80% | DSN/keys (Vika), e2e checkout |
| Crisis pipeline | 85% | Webhook-уведомления (#148) |
| GDPR / soft-delete / retention | 85% | DR-drill |
| Observability | 70% | Loki/Grafana/Sentry DSN (#138, #87) |
| DevOps deploy | 45% | K8s apply (Vika, #136) |
| Repo automation | 0% → ⌛ | этот сетап |
| Legal | 30% | юрист (#146) |

## Протокол сессии

- **Начало:** прочитать `STATE.md` + `BACKLOG.md` + последние 10 строк `WORK_LOG.md`.
- **Окончание:** обновить «В работе сейчас», «Заблокировано», добавить запись в `WORK_LOG.md`, при крупном решении — `DECISIONS.md`.
