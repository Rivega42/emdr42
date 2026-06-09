# THREAT MODEL — EMDR-AI (STRIDE)

Модель угроз для платформы EMDR-терапии. Активы: PHI (HIPAA), клинические
сессии, видео/аудио пациентов, LLM-диалоги, billing.

Обновлять при добавлении внешних интеграций или новых типов данных.

---

## 1. Активы и доверительные границы

```
[Браузер пациента] --TLS--> [nginx gateway] --> [api / orchestrator]
       │ камера/микрофон                        │
       └--WebRTC--> [LiveKit]                   ├--> [PostgreSQL: PHI encrypted at field level]
                                                ├--> [Redis: трансиент]
                                                ├--> [LLM-провайдеры: Anthropic/OpenAI/Ollama] ← внешняя граница
                                                └--> [Stripe] ← внешняя граница
```

Критичные активы: PHI-поля (зашифрованы AES-256-GCM на уровне полей),
видео эмоций (не покидает клиент — TF.js edge-инференс), транскрипты,
crisis events, audit log.

---

## 2. STRIDE

### S — Spoofing
| Угроза | Митигция |
|--------|----------|
| Кража учётки пациента | bcrypt(12), lockout 5 попыток/15 мин, MFA TOTP + backup codes (#114) |
| Кража JWT | access TTL 15 мин, refresh rotation с theft-детекцией (count=0 → revoke all) |
| Подделка Stripe webhook | подпись `STRIPE_WEBHOOK_SECRET`, rawBody verification |
| Spoofing WebSocket-сессии | JWT на handshake; ownership-проверка `getOwnedSession` на каждый event |

### T — Tampering
| Угроза | Митигция |
|--------|----------|
| Изменение чужой EMDR-сессии | per-event ownership в orchestrator registry; IDOR-гард в API (therapist → только assigned, #221/#222) |
| Prompt injection (пациент → LLM) | prompt-armor preamble + injection-детектор + data-делимитеры для patientContext (#128, #221) |
| Подмена reattach сессии | reattach только detached + userId match (#221) |
| SQL injection | Prisma parameterized; SanitizePipe на входе |

### R — Repudiation
| Угроза | Митигция |
|--------|----------|
| Отрицание доступа к PHI | AuditLog: SESSION_READ/TRANSCRIPT_READ с actorId, 6 лет retention, без FK (переживает hard-delete) |
| Отрицание crisis-событий | CrisisEvent — clinical record, явное удаление только GDPR-процедурой |

### I — Information Disclosure
| Угроза | Митигция |
|--------|----------|
| Утечка PHI из БД (дамп) | field-level AES-256-GCM (PHI_FIELDS_BY_MODEL allow-list), key rotation registry |
| PHI к LLM-провайдеру | PII-redaction (имена), self-hosted Ollama как fallback; BAA обязателен для cloud (см. #146) |
| Чужие сессии через API | IDOR-гарды (therapist=assigned only); safety-events ADMIN-only |
| Утечка через логи | pino structured, PHI не логируем; gitleaks в CI |
| XSS → localStorage токены | CSP, SanitizePipe, helmet; миграция на HttpOnly cookies — #115 (открыто) |

### D — Denial of Service
| Угроза | Митигция |
|--------|----------|
| Брутфорс auth | Redis-backed Throttle (5/час login) |
| Спам session:emotion / voice:audio | per-socket rate-limit (30/sec emotion, 60/sec audio chunks) |
| LLM-бюджет burn | maxTokens cap, circuit breaker, UsageLog cost tracking, fallback на Ollama |
| Intake-спам | honeypot, 5/час/IP + 3/24ч/email, consent required |
| OOM orchestrator | SessionRegistry TTL sweeper, emotionBuffer cap 1800 |

### E — Elevation of Privilege
| Угроза | Митигция |
|--------|----------|
| PATIENT → THERAPIST/ADMIN | role в JWT, смена роли только ADMIN endpoint + audit |
| Therapist → чужие пациенты | TherapistPatient relation check на каждом endpoint |
| Mass assignment | ValidationPipe whitelist + forbidNonWhitelisted |

---

## 3. Принятые риски (зафиксировано)

| Риск | Обоснование | Пересмотр |
|------|-------------|-----------|
| Токены в localStorage (XSS-доступны) | CSP + sanitization снижают XSS; cookie-миграция — #115 | до production-запуска |
| Cloud LLM видит редактированный диалог | PII-redaction + armor; полная приватность = Ollama-only режим | при подписании BAA |
| Stripe webhook handler может выполниться дважды в микросекундном race | handlers идемпотентны (upsert) | при росте нагрузки |

---

## 4. Открытые пункты

- #115 — CSRF + SameSite HttpOnly cookies (P0 до запуска)
- #137 — бэкапы (P0, см. DISASTER_RECOVERY.md)
- #146 — BAA / informed consent (P0 legal)
- #158 — полный gitleaks-скан истории (devops)
