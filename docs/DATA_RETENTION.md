# Data Retention Policy

Политика хранения и удаления данных EMDR-AI Therapy Assistant.

Применяется для compliance с HIPAA, GDPR, Российский 152-ФЗ.

---

## 1. Категории данных

| Категория | Содержит | Классификация |
|-----------|----------|---------------|
| **PHI — Protected Health Information** | Session records, emotion tracks, SUDS/VOC, safety events, transcripts, recordings, crisis events | HIPAA Protected |
| **PII — Personal Identifiable Information** | email, name, phone, country, emergency contact | GDPR Personal Data |
| **Authentication** | password hashes, refresh tokens, verification tokens, MFA secrets | Sensitive |
| **Audit logs** | Все действия с PHI/PII, login attempts, admin actions | HIPAA Audit Required |
| **Billing** | Subscriptions, invoices (без card numbers — у Stripe) | Financial |
| **Telemetry** | Usage logs (LLM/TTS/STT calls), cost tracking | Internal |

---

## 2. Retention periods

| Категория | Active retention | После deletion |
|-----------|------------------|----------------|
| User account (активный) | Без ограничений | — |
| User account (soft-deleted) | 30 дней grace period | → hard delete всех связанных PHI |
| Session PHI data (active user) | 2 года (730 дней) с последней активности | Soft delete → 30 дней grace → hard delete |
| Audit logs | 6 лет (HIPAA § 164.316) | После архив в cold storage |
| Authentication artifacts | До expiry + 30 дней | Auto cleanup |
| Recording files (audio/video) | 2 года | Encrypted delete в S3 |
| Billing invoices | 7 лет (tax requirements) | Archive, не hard delete |
| Usage logs | 90 дней в hot storage | Aggregate → archive |
| Crisis events | 6 лет | Archive |

---

## 3. Soft delete vs hard delete

**Soft delete** (`deletedAt` field):
- User.deletedAt → записи продолжают существовать, но скрыты от API
- Session.deletedAt → аналогично
- 30-дневный grace period — пользователь может отменить через `POST /users/me/cancel-deletion`

**Hard delete** (полное удаление из БД):
- Вызывается:
  - Retention job (cron) после grace period
  - Admin manually через `DELETE /users/:id/data`
- Cascading: sessions → timelineEvents/emotionRecords/sudsRecords/vocRecords/safetyEvents
- Other: therapistNotes, therapistPatient, crisisEvent, refreshToken, verificationToken, user

---

## 4. Export (GDPR Art. 15)

Endpoint: `GET /users/me/export`

Возвращает JSON:
- User profile (без passwordHash/resetToken)
- Все sessions + вложенные emotionRecords/suds/voc/safety/timeline events
- `gdprBasis: "Article 15 — Right of access"` pointer

Формат: JSON с pretty print. Content-Disposition: attachment.

---

## 5. Deletion (GDPR Art. 17 / Right to be Forgotten)

Endpoint: `DELETE /users/me`

Процесс:
1. User.deletedAt = now
2. Session.deletedAt = now, dataExpiresAt = now + 30 days
3. Запись в AuditLog: `DATA_DELETION_REQUEST`
4. Через 30 дней — retention job делает hard delete
5. Запись в AuditLog: `DATA_HARD_DELETE` (audit остаётся даже после hard delete — это требование HIPAA)

Исключения (нельзя удалить):
- Billing invoices (налоговые требования, 7 лет)
- Audit logs (HIPAA, 6 лет)
- Анонимизированная usage telemetry

---

## 6. Backup retention

- Daily full PostgreSQL backups — rolling 30 дней
- Monthly snapshots — rolling 12 месяцев
- WAL archiving — rolling 7 дней (для PITR)
- Все бэкапы encrypted at rest (S3 SSE-KMS или AES-256)

При запросе deletion (GDPR Art. 17):
- Current production data: удаляется сразу (см. выше)
- Backups: данные останутся до истечения retention периода
- User уведомляется: "ваши данные удалены из production немедленно и будут полностью стёрты из backups в течение 12 месяцев"

---

## 7. Retention job

Вызывается ежедневно через cron:
```
0 3 * * *  docker exec <api> npm run retention:run
```

Делает:
1. `User.deletedAt < NOW() - 30 days` → hardDeleteAllData()
2. `Session.dataExpiresAt < NOW()` → soft delete
3. `Session.createdAt < NOW() - 2 years` → soft delete если ещё не deleted
4. Expired VerificationToken и RefreshToken → cleanup

Код: `UsersService.runRetentionJob()` + `RefreshTokenService.cleanup()`

---

## 8. Data localization

### Russia (152-ФЗ)

Персональные данные пользователей из РФ должны храниться на серверах в РФ.

Текущая архитектура — международная. Для РФ пользователей нужен:
- Отдельный deployment в YandexCloud / VK Cloud / другой РФ provider
- Separate DB с данными РФ пользователей
- Политика data routing по IP / user.country

Это **НЕ реализовано** — блокер для официального launch в РФ.

### EU (GDPR)

Серверы могут быть где угодно, но:
- Standard Contractual Clauses (SCC) для transfers в US / non-adequate countries
- Data Processing Agreement с Anthropic / OpenAI / LiveKit

### US (HIPAA)

- Business Associate Agreement (BAA) с каждым провайдером, который touches PHI:
  - Anthropic (BAA доступен на Enterprise plan)
  - OpenAI (BAA доступен на Enterprise plan)
  - AWS / GCP / Azure — при использовании для hosting
  - Twilio (если SMS содержит PHI)
  - Stripe (для billing — обычно не touches PHI)

---

## 9. Minimization

Принцип: храним минимум необходимого.

- Ссылки / URL к recordings не хранят полный контент — только key в object storage
- LLM calls не сохраняют полный prompt/response — только metadata (cost, tokens, duration)
- Emotion records — агрегированные значения, без raw video frames

---

## 10. Access control

| Role | Access |
|------|--------|
| Patient | Own data only |
| Therapist | Patients where `TherapistPatient.status = ACTIVE` + `patientId = own` |
| Admin | Full access — **all actions audited** |
| ML researcher (future) | Только анонимизированные aggregates, не individual records |

---

## 11. Monitoring retention compliance

Queries для alerting:

```sql
-- Просроченные user deletions
SELECT COUNT(*) FROM "User"
WHERE "deletedAt" < NOW() - INTERVAL '31 days';

-- Sessions past retention
SELECT COUNT(*) FROM "Session"
WHERE "createdAt" < NOW() - INTERVAL '2 years 30 days' AND "deletedAt" IS NULL;

-- Audit log на старые записи (must be retained)
SELECT COUNT(*), MIN(timestamp) FROM "AuditLog";
```

Alert если retention job не запускался 48 часов.

---

## 12. User-facing privacy controls

В Settings странице пользователь может:
- Скачать свои данные (JSON)
- Удалить аккаунт (30-day grace)
- Отменить удаление (в grace period)
- Настроить notification preferences
- Увидеть список активных sessions (refresh tokens) + logout all

---

**Owner:** DPO (Data Protection Officer) — TBD
**Review:** ежегодно + при каждом major законодательном изменении
**Last review:** 2026-04-17
