# Work Log — Project Review Cleanup (claude/project-review-issues-En09l)

Ветка: `claude/project-review-issues-En09l`
Начало: 2026-04-17

## Порядок работ

Фокус — P0/P1 задачи из созданных issues #104–#151. Коммиты атомарные, по одной issue (или тесно связанной группе).

## Трекер

| # | Issue | Статус | Commit | Заметки |
|---|-------|--------|--------|---------|
| 1 | #144 | done | `chore: cleanup` | Удаление legacy HTML + синхронизация TODO.md |
| 2 | #141 | done | `chore(repo)` | CODEOWNERS, PR template, SECURITY.md, .editorconfig, .nvmrc |
| 3 | #127 | done | `chore(ml)` | Удаление пустого ml-service (решение: удалить) |
| 4 | #104 | done | `feat(frontend): error/404/offline/middleware` | error.tsx, not-found.tsx, offline page, auth middleware, favicon |
| 5 | #108 | done | `feat(seo): metadata + Next/Font` | Metadata exports, next/font/google |
| 6 | #110 | done | `fix(context): TherapyContext safe parse` | try/catch + Zod validation |
| 7 | #117 | done | `fix(orchestrator): memory leak cleanup` | TTL + try/finally + disconnect handler |
| 8 | #124 | done | `feat(ops): healthz/readyz + graceful shutdown + correlation IDs` | K8s naming + middleware |
| 9 | #126 | done | `chore(seed): safe seed with faker` | Random passwords + NODE_ENV guard |
| 10 | #135 | done | `chore(docker): resource limits + healthchecks` | depoloy.resources + healthchecks |

## Появившиеся новые issues в ходе работы

(будут фиксироваться здесь со ссылками)
