# Legal Documents — DRAFT (требует юридическую ревизию)

**⚠️ ВНИМАНИЕ**

Все документы в этой папке — **ЧЕРНОВИКИ**, составленные разработчиком как starting point. **Они НЕ являются юридически обязательными до ревизии квалифицированным юристом** в соответствующих юрисдикциях.

Запуск платформы в production БЕЗ ревизии этих документов = **незаконная обработка ПДн + медицинской информации** → штрафы до €20M (GDPR), до $1.5M per year (HIPAA), до 6М ₽ (152-ФЗ).

---

## Обязательные документы

| Документ | Назначение | Статус |
|----------|-----------|--------|
| `TERMS_OF_SERVICE.md` | Договор-оферта с пользователем | DRAFT |
| `PRIVACY_POLICY.md` | Политика обработки ПДн | DRAFT |
| `INFORMED_CONSENT.md` | Информированное согласие на EMDR-терапию | DRAFT |
| `BAA_TEMPLATE.md` | Business Associate Agreement (HIPAA) | DRAFT |
| `COOKIES_POLICY.md` | Cookies + tracking | DRAFT |
| `DPA_TEMPLATE.md` | Data Processing Agreement (GDPR) | TODO |

## 🔧 Инструкции для Вики — Legal ревизия

### Шаг 1: Определить юрисдикции

Где запускать?
1. **Россия (152-ФЗ + медицинская лицензия)**
2. **ЕС (GDPR + Medical Device Regulation MDR)**
3. **США (HIPAA + state-level privacy laws — CCPA для California)**
4. **UK, Canada, Australia** — похожие на ЕС/US

Для MVP рекомендую выбрать 1-2 юрисдикции. В этих jurisdiction понадобятся локальные юристы.

### Шаг 2: Нанять юриста

**Ключевые критерии:**
- Специализация: digital health / telemedicine / data protection
- Опыт с MDR (если EMDR классифицируется как medical device)
- Знание AI/ML specific regulations (EU AI Act)

**Где искать:**
- РФ: CLEGAL, Dentons, Linklaters (Russia), юрфирмы с digital health практикой
- США: Morgan Lewis, Hogan Lovells — digital health groups
- ЕС: Bird & Bird, Taylor Wessing — health tech

**Бюджет:** $5k-$50k на первичный review + $1-3k/месяц ongoing.

### Шаг 3: Дать юристу эти шаблоны + контекст

Юрист должен знать:
1. Что платформа делает (EMDR + AI assistant)
2. Какие провайдеры (Anthropic, OpenAI, Deepgram, LiveKit, Stripe, SendGrid, Twilio)
3. Где хостится (cloud provider, регион)
4. Какая аудитория (patients, therapists, age ranges)
5. Клиническая модель: self-help tool vs medical device vs therapy tool

### Шаг 4: Специфические вопросы для юриста

**Medical device classification:**
- В ЕС: нужна ли MDR CE-маркировка?
- В США: FDA exempt (wellness) или FDA-cleared medical device?
- Критично: если classified as medical device — понадобится clinical trial + regulatory submission

**EMDR specific:**
- Может ли приложение называть это "therapy" без лицензированного therapist?
- Нужны ли медицинские лицензии в каждой юрисдикции?
- Ограничения на EMDR без therapist supervision — есть в нескольких странах

**AI:**
- EU AI Act: GPAI модели (Anthropic, OpenAI) — transparency obligations
- High-risk AI в health — дополнительные требования

**Age restrictions:**
- В ЕС: 16+ без parental consent (GDPR Art. 8)
- В США: 13+ для COPPA; California 16+ SB-568
- Многие страны: EMDR не рекомендуется для несовершеннолетних без therapist

### Шаг 5: BAA с провайдерами

HIPAA требует BAA с каждым Business Associate (subcontractor, touching PHI).

**Обязательные BAA (если запуск в США):**
- Anthropic: https://support.anthropic.com/en/articles/8956306-can-i-get-a-business-associate-agreement-baa
- OpenAI: https://openai.com/enterprise-privacy (Enterprise plan only)
- AWS/GCP/Azure: signed during account setup
- Twilio: https://www.twilio.com/legal/baa
- LiveKit: contact sales

**Для SendGrid/Mailgun/Deepgram:**
- SendGrid: available on Pro+ plan
- Mailgun: Transactional plan
- Deepgram: contact sales для Enterprise

### Шаг 6: ePHI encryption

HIPAA Technical Safeguards:
- Encryption at rest (PHI_ENCRYPTION_KEY в Prisma middleware, #58) ✓
- Encryption in transit (TLS 1.2+ mandatory) — настроить за nginx gateway
- Access controls — RBAC ✓ (#112)
- Audit controls — AuditLog ✓ (#120)
- Integrity controls — Prisma migrations ✓ (#113)
- Authentication — JWT + MFA ✓ (#114)

### Шаг 7: Data Protection Officer (DPO)

**GDPR Art. 37** обязывает иметь DPO если:
- Core activities требуют систематического мониторинга subjects (да, мы)
- Large-scale processing sensitive data (да, PHI)

DPO может быть внешним (contractor) — экономичнее для startup.

### Шаг 8: Insurance

Купить:
- **Professional Liability (E&O)** — $1-5M coverage
- **Cyber Liability** — обязательно для PHI holders, $1-10M coverage
- **D&O (Directors & Officers)** — для инвесторов

Провайдеры: Coalition, At-Bay, Hiscox.

### Шаг 9: Acceptance flow

В коде уже есть:
- `User.dataConsentAt` — timestamp согласия на обработку ПДн
- `User.tosAcceptedVersion` — версия ToS, принятая пользователем
- Required checkboxes в registration UI — но UI ещё не подключён (issue #149)

После legal review:
1. Финализированные документы — в `docs/legal/` с versioning (`v1.0.md`, `v1.1.md`)
2. При каждом update ToS/Privacy — новое принятие обязательно
3. Legal change log для audit trail

### Шаг 10: Clinical Advisory Board

Перед launch:
- Нанять 2-3 лицензированных EMDR-терапевтов (EMDRIA certified)
- Они ревьюят clinical protocols (#131 RDI phase, #132 dissociation detection, crisis response)
- Подписывают off на safety protocols

---

## Текущие known legal блокеры

1. **EMDR self-guided без therapist** — в нескольких странах может быть нелегально / требует медицинскую лицензию
2. **AI therapy** — регулятор MO regulators (UK) классифицирует AI companions как medical devices
3. **Data localization для РФ** — 152-ФЗ требует хранить ПДн россиян в РФ
4. **Children (under 18)** — нужен parental consent flow
5. **Crisis handling** — если платформа не справилась с suicide risk → liability
