# CHANGELOG

Все заметные изменения в проекте документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версионирование — [SemVer](https://semver.org/lang/ru/).

> После ШАГА 7 этот файл будет автоматически генерироваться `release-please` (или текущим `release.yml`) — ручные правки только до настройки автоматики.

## [Unreleased]

### Added (chore/repo-setup)
- `AUDIT.md` — инвентаризация репо и план работ по `REPO_SETUP_PROMPT.md`.
- `STATE.md` — оперативный срез состояния проекта.
- `DECISIONS.md` — архитектурный decision log.
- `CHANGELOG.md` — этот файл.
- `.gitattributes` — правила нормализации EOL и атрибутов.

### Added (claude/project-review-issues-En09l)
- Real-time голосовой анализ интегрирован в `SafetyMonitor` (`packages/emdr-engine`).
- Closed-loop SUDS check-in таймер после каждого BLS-сета (`services/orchestrator`).
- UI сравнения сессий `/progress/compare?current=…&previous=…`.
- E2E smoke на защиту маршрутов и публичные billing-страницы.
- Stripe billing endpoints, MFA TOTP + backup-коды, crisis pipeline, audit-log, retention/soft-delete (см. issues #112–#149).

### Security (claude/project-review-issues-En09l)
- TOTP verify теперь использует `crypto.timingSafeEqual` и проверяет каждое окно безусловно.
- Backup-коды MFA: восстановлена полная 64-битная энтропия (`randomBytes(8).toString('hex')`).
- `TherapistNote.create` валидирует, что `sessionId` принадлежит тому же пациенту.

### Changed
- `services/api/src/main.ts` — security middleware (helmet, rate-limit) включены.

### Pending (Vika)
- Apply `scripts/setup-labels.sh` после ШАГА 6.
- Создать GitHub Project v2 + кастомные поля + native workflows (ШАГ 8.1).
- Branch protection main (ШАГ 8.4).
- GitHub Environments staging/production (ШАГ 7.4).
- GitHub Pages для дашборда (ШАГ 9.4).
- Включить Security Features (ШАГ 10.1).
- Stripe / Sentry / SMTP / Twilio / S3 ключи (см. issues #87, #137, #145, #148, #149).
