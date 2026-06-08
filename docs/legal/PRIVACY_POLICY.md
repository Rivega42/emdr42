# Privacy Policy — DRAFT v0.1

**⚠️ DRAFT — требует ревизии юристом.**

Last updated: TBD
Effective date: TBD

EMDR-AI Therapy Assistant ("we", "our") respects your privacy. This policy explains what we collect, how we use it, and your rights.

## 1. Data Controller

[Company Name, Address, Registration, DPO contact — TBD]

## 2. Data We Collect

### 2.1 You provide directly
- Account info: email, name, password (hashed), phone (optional)
- Emergency contact (for crisis safety)
- Country (for compliance + localized hotlines)

### 2.2 Health data (PHI / Special Category under GDPR)
- Session data: SUDS/VOC ratings, phases, duration
- Emotion recognition: camera-derived aggregates (stress, engagement — not raw video frames)
- Voice interactions: transcripts (if consented), usage metadata
- Therapist notes (if you have one assigned)
- Crisis events (if triggered)
- Session recordings (optional, only with explicit consent per session)

### 2.3 Automatically collected
- Device info: browser, OS (for security + compatibility)
- IP address (for fraud prevention, rate limiting)
- Usage analytics: pages visited, feature clicks (anonymized if possible)
- Performance telemetry: errors, crashes

### 2.4 From third parties
- Payment status from Stripe (no card numbers stored)
- Email delivery status from SendGrid/Mailgun

## 3. Legal Basis (GDPR)

- **Contract (Art. 6.1.b):** providing Service you signed up for
- **Consent (Art. 6.1.a + Art. 9.2.a):** processing health data; you can withdraw anytime
- **Legitimate interests (Art. 6.1.f):** fraud prevention, security, service improvement
- **Legal obligation (Art. 6.1.c):** tax, HIPAA, crisis reporting

## 4. How We Use Your Data

### Primary uses
- Deliver the EMDR Service (sessions, AI dialogue, BLS)
- Calculate progress metrics
- Process payments
- Send verification + security emails
- Provide crisis resources

### Secondary uses (with consent)
- Session recording (only if you toggle consent per session)
- Weekly progress summaries via email
- Clinical research (fully anonymized, opt-in)

### Never used for
- Selling data to advertisers
- Training public AI models (your transcripts are NOT used to train Anthropic/OpenAI models — ensure via BAA)

## 5. Third Parties Who Process Your Data

| Provider | Purpose | BAA/DPA |
|----------|---------|---------|
| Anthropic (Claude) | AI dialogue | BAA (US), DPA (EU) |
| OpenAI | Fallback LLM, STT/TTS | BAA (US) |
| Deepgram | Voice transcription | Contract required |
| LiveKit | Video/audio WebRTC | DPA + HIPAA compliance |
| Stripe | Payment processing | BAA / DPA |
| SendGrid / Mailgun | Email delivery | DPA |
| Twilio | SMS for verification/crisis | BAA |
| AWS / GCP | Infrastructure | BAA / DPA |

All providers bound by Data Processing Agreements and/or BAAs.

## 6. Data Retention

See [Data Retention Policy](../DATA_RETENTION.md). Summary:
- Active sessions: 2 years after last activity
- Audit logs: 6 years (HIPAA)
- Billing: 7 years (tax)
- Backups: up to 12 months

## 7. Your Rights (GDPR / CCPA / 152-ФЗ)

### Right to access (GDPR Art. 15)
Download all your data: Settings → Export Data (returns JSON).

### Right to rectification (Art. 16)
Edit profile via Settings.

### Right to erasure / "right to be forgotten" (Art. 17)
Request deletion: Settings → Delete Account. 30-day grace period, then hard delete.

### Right to restriction (Art. 18)
Contact dpo@emdr42.com to pause specific processing.

### Right to data portability (Art. 20)
Export provides data in JSON (machine-readable).

### Right to object (Art. 21)
Opt-out of marketing emails + analytics anytime.

### Right to withdraw consent
Withdraw at any time; does not affect prior processing legality.

### Right to lodge a complaint
Contact your local Data Protection Authority:
- EU: list at https://edpb.europa.eu/about-edpb/board/members_en
- UK: ICO (https://ico.org.uk)
- Russia: Roskomnadzor (https://rkn.gov.ru)
- US: FTC (for consumer privacy)

## 8. Security Measures

- Encryption at rest (AES-256 for PHI fields)
- Encryption in transit (TLS 1.2+)
- MFA-enabled accounts
- Access controls (RBAC)
- Audit logging of all PHI access
- Regular security audits
- Staff training on HIPAA / GDPR

## 9. International Transfers

If data is transferred outside your country:
- EU → US: Standard Contractual Clauses (SCC)
- Other: adequate safeguards per GDPR Art. 46

## 10. Children

We do not knowingly collect data from children under 13 without parental consent (16 in EU).

## 11. Cookies

See [Cookies Policy](./COOKIES_POLICY.md).

## 12. Changes to This Policy

Material changes notified via email 30 days in advance.

## 13. Contact

DPO: dpo@emdr42.com
General privacy: privacy@emdr42.com
Physical address: [TBD]

---

**Legal review TODO:**
- [ ] Юрисдикционные дополнения (каждая страна запуска)
- [ ] Russia-specific (152-ФЗ, localization requirements)
- [ ] CCPA (California) additional disclosures
- [ ] Brazilian LGPD if targeting Brazil
- [ ] DPO contract if required (GDPR Art. 37)
