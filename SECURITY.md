# Security Policy

## Supported Versions

Проект в активной разработке, security-фиксы применяются к последней версии ветки `main`.

| Версия | Поддержка |
| ------ | --------- |
| main   | ✅ |
| &lt; main | ❌ |

## Reporting a Vulnerability

**Не создавайте публичные issue на security-уязвимости.**

Если вы нашли уязвимость — сообщите приватно:

- **Email**: security@emdr42.local (заменить на реальный контакт перед публичным релизом)
- **GitHub Security Advisory**: https://github.com/Rivega42/emdr42/security/advisories/new (preferred)

### Что включить в отчёт

1. Тип уязвимости (XSS, SQLi, RCE, auth bypass, и т. д.)
2. Полный путь воспроизведения (файлы, строки, шаги)
3. Возможное влияние (PHI exposure, privilege escalation)
4. Proof-of-concept (по возможности без раскрытия PII)
5. Предлагаемое исправление (опционально)

### SLA

| Severity | Первый ответ | Fix target |
|----------|-------------|------------|
| Critical (RCE, PHI leak, auth bypass) | 24 ч | 7 дней |
| High (SQLi, XSS with session hijack) | 48 ч | 14 дней |
| Medium (CSRF, info disclosure) | 5 дней | 30 дней |
| Low (missing headers, verbose errors) | 14 дней | 90 дней |

### Safe Harbor

Если вы проводите research в рамках этой политики:

- Не совершайте brute force, DoS, social engineering
- Не получайте доступ к чужим данным (PHI, credentials)
- Не сохраняйте и не распространяйте извлечённые данные
- Дайте нам разумное время на исправление до публичного разглашения (90 дней)

В этом случае мы не будем инициировать юридические действия.

## Security Posture

Проект работает с Protected Health Information (PHI) в контексте EMDR-терапии. Основные security-меры:

- HIPAA/GDPR compliance baseline (#58)
- E2E шифрование терапевтических сессий (#61)
- Аудит логирование sensitive действий (#120)
- JWT + refresh token rotation + MFA (#114)
- Rate limiting + CSRF + CSP + Helmet (#115, #118)
- PII redaction перед отправкой в LLM (#128)
- Encrypted session recording (#122)
- Регулярный `npm audit` + Trivy scan (#139)

Для production-deployment см. `docs/RUNBOOK.md` (#142) и `docs/DATA_RETENTION.md` (#121).

## Threat Model

В работе: `docs/THREAT_MODEL.md` (#142) с STRIDE-анализом для:

- Malicious therapist accessing wrong patient (RBAC bypass)
- Compromised LLM provider exfiltrating PHI
- Prompt injection escalating to arbitrary therapy guidance
- Session recording unauthorised access
- Patient identity spoofing during consent
