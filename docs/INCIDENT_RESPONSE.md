# Incident Response Plan

## 1. Severity levels

| Severity | Определение | Пример | SLA Response |
|----------|-------------|--------|--------------|
| **SEV1 — Critical** | Весь сервис недоступен / security breach / PHI exposed | API 5xx на все запросы; unauthorized access к PHI | 15 мин |
| **SEV2 — High** | Core функциональность сломана для большинства | EMDR сессии не стартуют; crisis notifications не доходят | 1 час |
| **SEV3 — Medium** | Degraded experience / partial outage | LLM fallback активен; billing webhook отстаёт | 4 часа |
| **SEV4 — Low** | Non-critical bugs, UI issues | Отсутствие нужной localization; slow page load | 24 часа |

---

## 2. Response workflow

### Step 1: Detect
- Alert от Prometheus/PagerDuty
- User reports
- Monitoring dashboard

### Step 2: Acknowledge
- Respond в pager / Slack `#incidents` в течение SLA
- Создать incident record (пока в GitHub issue с меткой `incident`)

### Step 3: Triage
- Определить severity
- Собрать команду (CTO, on-call engineer, security lead если нужен)
- Создать Zoom / Google Meet для real-time coordination

### Step 4: Mitigate
- Остановить bleeding first (rollback, feature flag off, scale up)
- Коммуникация с пользователями (status page, email если SEV1/2)

### Step 5: Resolve
- Восстановить полный сервис
- Подтвердить мониторинг показывает baseline

### Step 6: Postmortem
- Blameless postmortem в течение 48 часов для SEV1/2
- Документировать root cause, impact, action items
- Share с командой

---

## 3. Roles

| Role | Responsibility |
|------|----------------|
| Incident Commander (IC) | Принимает решения, координирует |
| Communications Lead | Обновляет status page, Twitter, email users |
| Scribe | Ведёт таймлайн событий |
| SMEs | Expert в конкретном сервисе (DB, WS, LLM) — вызываются по необходимости |

Для small team — один человек может быть IC + Scribe.

---

## 4. Communication templates

### 4.1 Status page (external)

**Initial (до root cause):**
> We are aware of an issue affecting EMDR sessions. Our team is investigating. Updates every 15 minutes.

**Update:**
> Identified: root cause is [X]. Mitigation in progress. ETA resolution: [Y] minutes.

**Resolved:**
> Service has been restored. Postmortem will be shared by [date]. Sorry for the inconvenience.

### 4.2 Internal Slack

**SEV1:**
```
@oncall @security @cto
🚨 SEV1: [short description]
Impact: [# of users affected]
Status: investigating
IC: @<name>
Bridge: <zoom-link>
```

---

## 5. Security incident specific procedure

Если подозрение на utечку PHI / unauthorized access:

1. **Freeze** — не удалять никакие логи / записи
2. **Изолировать** — заблокировать скомпрометированные accounts / tokens
3. **Forensics** — собрать audit logs, nginx access logs, Redis reconstruction
4. **Уведомить**:
   - В РФ: Роскомнадзор в течение 24 часов (152-ФЗ)
   - В ЕС: Data Protection Authority в течение 72 часов (GDPR Art. 33)
   - В US HIPAA: Affected individuals + HHS в течение 60 дней при breach > 500 records
5. **Ротировать секреты** — JWT, PHI_ENCRYPTION_KEY (с миграцией данных), API keys провайдеров
6. **Внешний аудит** — нанять DFIR firm для SEV1 breaches

---

## 6. Disaster recovery targets

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 4 часа |
| RPO (Recovery Point Objective) | 1 час |
| Backup frequency | Ежедневно full, WAL каждые 5 мин |
| Backup retention | 30 дней rolling + monthly 12 months |

DR drill — раз в квартал; восстановить полный prod в staging из бэкапов.

---

## 7. Common incidents playbooks

### 7.1 Database corruption

1. Acknowledge — assess corruption scope
2. Isolate — pause write traffic (put API в read-only mode)
3. Restore from latest good backup (см. RUNBOOK.md)
4. Replay WAL если PITR настроен
5. Valid data — возобновить writes
6. Postmortem

### 7.2 LiveKit WebRTC deadlock

1. Проверить LiveKit logs
2. Restart livekit контейнер
3. Active sessions прервутся — пользователи увидят reconnecting state (client auto-retry)
4. Если множественные — обновить LiveKit до latest stable

### 7.3 JWT leak через github commit / logs

1. Немедленно ротировать JWT_SECRET
2. Redeploy API
3. Все пользователи выйдут — коммуникация: "для безопасности мы завершили все активные сессии, перелогиньтесь"
4. Audit log: искать подозрительные action в промежутке между leak и rotation
5. Postmortem + changes: pre-commit hooks для secrets detection (#139)

### 7.4 Ransomware / compromise host

1. **Изолировать host** — отключить от сети
2. Preserve volumes для forensics
3. Развернуть новую инфраструктуру из IaC (#136)
4. Восстановить данные из backup (сверить integrity чексуммами)
5. Rotate ВСЕ секреты
6. Force password reset всем пользователям
7. Notification пользователям (см. legal requirements)

---

## 8. Contacts

Replace during setup:
- On-call pager: PagerDuty / OpsGenie / Twilio SMS
- CTO: [name, phone]
- Security lead: [name, phone]
- Legal / DPO: [name, email]
- Stripe support: https://support.stripe.com
- Anthropic support: support@anthropic.com
- LiveKit support: support@livekit.io
- Cloud provider (AWS/GCP/DO): [link to support plan]
- Security disclosure: security@emdr42.com

---

## 9. Legal / regulatory reporting

### HIPAA breach notification

Если PHI exposed для unauthorized access:
- Affected individuals: письменно в течение 60 дней
- HHS: через Breach Notification Portal https://ocrportal.hhs.gov в течение 60 дней (>500 records)
- Media: если >500 records в одном штате — уведомление prominent media

### GDPR breach notification

Если personal data leak для EU residents:
- Supervisory authority в течение 72 часов (Ст. 33 GDPR)
- Data subjects: если high risk — без задержки

### 152-ФЗ (Россия)

- Роскомнадзор в течение 24 часов — через форму на сайте
- Субъекты ПДн — в течение 72 часов
