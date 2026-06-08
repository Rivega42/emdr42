# Аудит репозитория

**Дата:** 2026-04-30
**Аудитор:** Claude Code (репозиторий-сетап по `REPO_SETUP_PROMPT.md`)
**Ветка работы:** `chore/repo-setup`

## Контекст

- **Стек:** Next.js 13 (App Router) + React 18 + TypeScript 5 + Tailwind / NestJS 10 + Prisma 5 / PostgreSQL 15 / Redis 7 / Socket.io / LiveKit / TensorFlow.js / Three.js
- **Тип:** SaaS терапевтическое приложение (EMDR-AI Therapy Assistant), монорепо pnpm + Turborepo
- **Стадия:** активная разработка (≈157 коммитов, MVP-готовность 60–85% по подсистемам)
- **Размер:** ~372 .ts/.tsx/.mjs/.js файла (без `node_modules`); ≈5 актуальных TODO/FIXME маркеров
- **Workspaces:** `app/` (Next-фронт) + `services/{api,orchestrator}` + `packages/{core,emdr-engine,ai-providers,events,livekit-integration}`
- **Ветки:** `main` (релизная), `claude/project-review-issues-En09l` (актуальные правки 60+ коммитов), `chore/repo-setup` (текущая)

## Сильные стороны (сохранить)

- Чёткое разделение `app / packages / services` — модульность работает
- Полный CLAUDE.md с гайдлайнами (Karpathy-принципы, стайлгайды TS/React/CSS)
- Prisma + миграционная дисциплина задана (#113 хоть и открыт)
- Существующий CI: `ci.yml`, `codeql.yml`, `dependency-review.yml`, `docker.yml`, `e2e.yml`, `prisma-drift.yml`, `release.yml`, `security.yml`
- Документация уже есть: `ROADMAP.md`, `BACKLOG.md`, `WORK_LOG.md`, `RUNBOOK.md`, `INCIDENT_RESPONSE.md`, `DATA_RETENTION.md`, `WHITEPAPER.md`, `ARCHITECTURE.md`
- Соблюдается русский язык артефактов
- Conventional Commits применяются

## Существующие конвенции (уважать, не переписывать)

- Conventional Commits + scope (`feat(scope): …`, `fix(scope): …`, …)
- `lib/`, `contexts/`, `app/(protected)/` — уже сложившаяся структура Next, не трогать
- `pnpm` как пакетный менеджер (`pnpm-lock.yaml`, `pnpm-workspace.yaml`)
- Русский в комментариях верхнего уровня и документации; технические термины — англ.
- Лейблы issues уже частично заданы (`P0/P1/P2/P3`, `backend`, `frontend`, `devops`, `infra`, `compliance`, `legal`, `billing`, `backup`, …)

## Что сломано

- **Нет `STATE.md`** — текущее состояние раскидано между `WORK_LOG.md`, `ROADMAP.md`, открытыми issues
- **Нет `DECISIONS.md` / `docs/adr/`** — архитектурные решения нигде не зафиксированы как ADR
- **Нет `CHANGELOG.md`** — есть только `release.yml` который, вероятно, должен его генерировать
- **`.github/ISSUE_TEMPLATE/`** содержит только два markdown-шаблона (`bug_report.md`, `feature_request.md`) вместо YAML-форм
- **Нет `.github/PULL_REQUEST_TEMPLATE.md`**
- **Нет `.github/CODEOWNERS`**
- **Нет `.github/dependabot.yml`** (есть `dependency-review.yml`, но не Dependabot)
- **Нет `.github/labeler.yml`** + workflow для авто-лейблов
- **Нет автоматизации Project v2 / sub-issue rollup / epic-sync**
- **Нет дашборда** (`tools/dashboard/`)
- **Нет правил для AI-исполнителей** (`docs/ai/CLAUDE_CODE_RULES.md`, `VIKA_RULES.md`, `DEVOPS_RULES.md`, `EXTERNAL_TASKS.md`)
- **Нет контекста для AI** (`docs/context/PRODUCT_CONTEXT.md`, `DOMAIN.md`, `GLOSSARY.md`)
- **Нет директории `_archive/`** для перемещения устаревших артефактов

## Что отсутствует (по плану ШАГА 3)

- `docs/adr/`, `docs/architecture/`, `docs/api/`, `docs/runbooks/`, `docs/guides/`, `docs/ai/`, `docs/prompts/`, `docs/context/`, `docs/GLOSSARY.md`, `docs/README.md` (карта)
- `infra/` (отдельно от `k8s/` — Terraform/Helm и т.д.)
- `tools/dashboard/`
- `scripts/automation/`
- `_archive/`

## Технический долг

- `(this.prisma as any)` уже вычищены (62 коммита Wave-3 + cleanup-pass)
- ≈5 TODO/FIXME без author/date в `services/`, `app/`, `packages/`
- Markdown-link-check не настроен — битые ссылки могут быть
- `markdownlint` не настроен

## Безопасность

- **Секреты в истории:** не проверено инструментально (`gitleaks` отсутствует в окружении). Ручной grep по известным префиксам (`sk-`, `AKIA`, `ghp_`, `AIza`) дал 0 совпадений вне `node_modules`. **Рекомендуется P1 issue для Вики** на полный gitleaks-скан истории.
- `CodeQL` уже работает (`.github/workflows/codeql.yml`)
- `dependency-review` уже работает
- `SECURITY.md` уже есть
- `next.config.js` задаёт security headers (Permissions-Policy, X-Frame-Options, X-Content-Type-Options) — соответствует CLAUDE.md

## План работ (по ШАГАМ промпта)

| ШАГ | Цель | Статус | Тип |
|---|---|---|---|
| 1 | AUDIT.md | 🔄 | сам |
| 2 | STATE/DECISIONS/CHANGELOG (CLAUDE/README/ROADMAP/BACKLOG/SECURITY/LICENSE/.editorconfig/.gitignore — уже есть) | ⏸ | сам, бережно |
| 3 | Структура `docs/{adr,architecture,api,runbooks,guides,ai,prompts,context,GLOSSARY.md,README.md}`, `infra/`, `tools/dashboard/`, `scripts/automation/`, `_archive/` | ⏸ | сам |
| 4 | `docs/ai/{CLAUDE_CODE_RULES,CLAUDE_DESIGN_RULES,VIKA_RULES,DEVOPS_RULES,EXTERNAL_TASKS,AUTOMATION}.md` | ⏸ | сам + копия из kit |
| 5 | `docs/context/{PRODUCT_CONTEXT,DOMAIN}.md`, `docs/GLOSSARY.md`, `docs/prompts/` | ⏸ | сам |
| 6 | Лейблы (`scripts/setup-labels.sh`) + 6 YAML issue-форм + PR-template | ⏸ | сам копировать; **issue для Вики** на apply |
| 7 | CI: `ci-pr/deploy-staging/deploy-prod/release-please/labeler/dependabot`. Существующие workflow (ci.yml, e2e.yml, codeql.yml, …) **сохраняем**, добавляем недостающее. **Issue для Вики** на GitHub Environments | ⏸ | сам + Vika |
| 8 | Автоматизация: 8 workflow + 9 mjs скриптов. **Issue для Вики** на Project v2 + Branch protection + PROJECT_TOKEN | ⏸ | сам + Vika |
| 9 | `tools/dashboard/` (React+Vite+Tailwind заготовка) + `dashboard-fetch.mjs` + `dashboard-sync.yml`. **Issue для Вики** на GitHub Pages | ⏸ | сам + Vika |
| 10 | gitleaks scan + final issues + PR | ⏸ | сам + Vika |

## Открытые вопросы для founders

1. **Лицензия?** В корне есть `LICENSE` — проверить что верная (проект коммерческий или OSS).
2. **Стратегия веток?** Сейчас trunk-ish (main + длинные feature-ветки). Подтвердить trunk-based или формализовать git-flow.
3. **Список запретных зон?** Что нельзя редактировать без явного согласия (например, `prisma/migrations/`, `legal/`).
4. **Telegram chat_id для уведомлений (`notify.mjs`).**
5. **URLs staging / prod** — для `deploy-staging.yml` и `deploy-prod.yml`.
6. **Состав команды и CODEOWNERS** — чьи review требовать.
7. **Существующие открытые issues** (≥149 уже создано) — нужно ли их мигрировать в новые YAML-формы / Project v2.

## Решения, принятые на этапе аудита

- Все шаги выполняются в ветке `chore/repo-setup` (как требует промпт).
- Существующие workflow в `.github/workflows/` **не переписываются** — добавляются только недостающие из kit.
- Существующий `CLAUDE.md` сохраняется; обновляется только разделом про `STATE.md`-протокол и ссылками на новые документы.
- Markdown-шаблоны issues (`bug_report.md`, `feature_request.md`) перемещаются в `_archive/2026-04-30/` и заменяются на YAML-формы из kit.
