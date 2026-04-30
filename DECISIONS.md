# Архитектурные решения (Decision Log)

> Лёгкая ADR-лента. Каждое значимое решение фиксируется записью с датой, контекстом, опциями и обоснованием. Полные ADR в формате RFC хранятся в `docs/adr/`.

## Шаблон записи

```markdown
## YYYY-MM-DD — Краткое название
**Статус:** proposed / accepted / superseded by NNN
**Контекст:** что вынудило решать
**Опции:** A, B, C
**Решение:** выбрано B, потому что …
**Последствия:** что меняется в коде / процессе / стоимости
```

---

## 2026-04-30 — Repo automation kit принят как стандарт

**Статус:** accepted
**Контекст:** репозиторий разросся (≥149 issues, 5+ workspaces, 2 сервиса), управление состоянием задач происходит вручную через ROADMAP.md / BACKLOG.md / WORK_LOG.md. Нет дашборда, нет автоматизации sub-issues / эпиков / зависимостей.
**Опции:**
A. Продолжить ручное управление через markdown-файлы.
B. GitHub Project v2 + кастомные workflow-ы автоматизации (`repo-setup-kit`).
C. Внешний Jira / Linear.
**Решение:** B — `repo-setup-kit` развёрнут через `REPO_SETUP_PROMPT.md`. Source of truth = GitHub Project v2 + Sub-issues API + Milestones; markdown-файлы становятся срезами/лонгридами.
**Последствия:**
- 8 новых automation-workflow + 9 mjs-скриптов в `scripts/automation/`.
- Существующие markdown-шаблоны issues (`bug_report.md`, `feature_request.md`) переходят в `_archive/2026-04-30/`, заменяются на YAML-формы.
- Часть шагов (создание Project, branch-protection, GitHub Pages, выдача `PROJECT_TOKEN`) вынесена в issues для Вики — без её доступа к admin-правам репо мы не можем выполнить сами.

## 2026-04-30 — Существующие CI workflow не переписываются

**Статус:** accepted
**Контекст:** В `.github/workflows/` уже есть `ci.yml`, `codeql.yml`, `dependency-review.yml`, `docker.yml`, `e2e.yml`, `prisma-drift.yml`, `release.yml`, `security.yml`. `repo-setup-kit` предлагает свои `ci-pr.yml`, `deploy-staging.yml`, `deploy-prod.yml`, `release-please.yml` и т. д.
**Опции:**
A. Полная замена на kit (потеряем prisma-drift, security, dependency-review).
B. Слияние — добавляем то, чего нет, не трогаем существующее.
**Решение:** B. Конкретно:
- `ci.yml` остаётся как основной build/lint/test pipeline (kit-овый `ci-pr.yml` НЕ копируется).
- `release.yml` остаётся; `release-please.yml` из kit НЕ копируется (текущий уже формирует релизы).
- Из kit копируются только новые: `auto-labels.yml`, `sub-issue-rollup.yml`, `epic-board-sync.yml`, `dependency-resolver.yml`, `validate-issue.yml`, `weekly-digest.yml`, `stale-cleanup.yml`, `notifications.yml`, `dashboard-sync.yml`, `labeler.yml`, `deploy-staging.yml`, `deploy-prod.yml` (последние два требуют адаптации под Vika-окружение).
**Последствия:** избегаем регрессии в основном CI, получаем только automation-слой поверх.

## 2026-04-30 — Источник правды для состояния задач

**Статус:** accepted
**Контекст:** `STATE.md`, `ROADMAP.md`, `BACKLOG.md`, GitHub Issues, GitHub Project v2 — все могут расходиться.
**Решение:**
- **Project v2** — операционный source of truth для статуса/спринта/приоритета.
- **Issues** — содержание задачи (требования, AC).
- **`ROADMAP.md`** — квартальный план + видение, генерируется/синхронизируется через `epic-sync.mjs`.
- **`BACKLOG.md`** — снимок из issues с лейблом `статус: бэклог`.
- **`STATE.md`** — короткий «срез сейчас», обновляется в начале/конце сессии.
- **`WORK_LOG.md`** — журнал коммитов и решений по сессиям.
**Последствия:** ROADMAP.md и BACKLOG.md больше не редактируются руками — только через скрипты автоматизации (после ШАГА 8).

## 2026-04-30 — Markdown issue-шаблоны → YAML-формы

**Статус:** accepted
**Контекст:** `bug_report.md` и `feature_request.md` — свободный текст. Не интегрируются с `validate-issue.mjs` (нет обязательных полей).
**Решение:** заменить на YAML-формы из kit (`bug_report.yml`, `feature_request.yml`, `task.yml`, `tech_debt.yml`, `epic.yml`, `vika_devops.yml`). Старые `.md` — в `_archive/2026-04-30/`.
**Последствия:** валидация полей (acceptance criteria, эпик, приоритет) становится автоматической.

---

> Следующие решения будут добавляться по мере прохождения ШАГОВ. Полноценные ADR — в `docs/adr/NNNN-title.md`.
