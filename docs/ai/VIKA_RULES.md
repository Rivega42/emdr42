# Правила для Вики

> Вика — внешний DevOps-помощник с admin-правами на инфру и GitHub-репо. Claude Code не имеет этих прав → отдаёт задачи Вике через issues с тегом `[devops:vika]`.

## Когда передавать Вике

- Любая команда, требующая GitHub admin (`gh api repos/:owner/:repo/...`, branch protection, environments, security features, secrets/PAT).
- Любое действие в облаке (AWS / GCP / Azure / DigitalOcean / Cloudflare).
- DNS, certs (вне `cert-manager`).
- Создание managed-сервисов (RDS, ElastiCache, S3, …).
- Apply Kubernetes-манифестов, помощь с `kubectl`.
- Ротация секретов после инцидента.
- Триаж production-инцидентов на стороне инфры.

## Что НЕ передавать Вике

- Логику приложения, тесты, рефакторинг, написание документации — это Claude Code сам.
- Решения о продуктовом скоупе — это founders.
- Дизайн UI — это Claude Design / дизайнер.

## Формат задачи (обязателен)

```markdown
Title: [devops:vika] <короткое действие>

## Цель
<Что должно произойти и зачем — 2-3 предложения.>

## Окружение
<dev / staging / prod / github-org / github-repo / cloud-provider>

## Приоритет
P0 (блокер) / P1 (важно) / P2 (улучшение) / P3 (nice-to-have)

## Команды (пошагово)
\`\`\`bash
команда 1
команда 2
\`\`\`

## Verification
<Как проверить, что применилось.>

## Acceptance criteria
- [ ] критерий 1
- [ ] критерий 2

## Связанные документы
<Ссылки на ROADMAP, DECISIONS, другие issues.>
```

## Чего ждать от Вики

- Подтверждение/комментарий «выполнено» в issue с приложенным выводом команд (с redacted-секретами).
- Если что-то не сработало — комментарий с ошибкой и stop-the-line.
- Если задача ставит под угрозу прод — Вика обязана сначала уточнить.

## Эскалация

- Любой P0 — Telegram-уведомление автоматическое (`notify.mjs` → канал `vika_alerts` после ШАГА 8).
- Если Вика не отвечает 24 ч на P0 / 72 ч на P1 — уведомление эскалируется founders.

## Связанные документы

- [`EXTERNAL_TASKS.md`](EXTERNAL_TASKS.md) — общий шаблон передачи задачи
- [`DEVOPS_RULES.md`](DEVOPS_RULES.md) — стандарты DevOps (применимо к Вике в т. ч.)
- [`../../CLAUDE.md`](../../CLAUDE.md) — упоминание формата vika-issue
- [`AUTOMATION.md`](AUTOMATION.md) — автоматика, отслеживающая vika-issues (метки, дашборд)
