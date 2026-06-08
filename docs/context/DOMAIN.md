# Домен EMDR

> Доменные знания для AI-исполнителей. Если код использует термины из EMDR-протокола, проверь, что используется правильно.

## EMDR (Eye Movement Desensitization and Reprocessing)

Психотерапевтический метод обработки травматических воспоминаний через билатеральную стимуляцию (BLS) одновременно с фокусом пациента на травматическом образе. Разработан Francine Shapiro (1987–89). Эффективность по PTSD подтверждена RCT (Watts et al., 2013; Chen et al., 2014).

## Восемь фаз протокола

1. **History & Treatment Planning** — сбор истории, идентификация target memories.
2. **Preparation** — обучение, RDI (Resource Development & Installation), safe-place.
3. **Assessment** — выбор target, NC (Negative Cognition), PC (Positive Cognition), VOC, эмоции, телесное ощущение, SUDS.
4. **Desensitization** — основные сеты BLS до SUDS = 0–1.
5. **Installation** — усиление PC до VOC = 6–7.
6. **Body Scan** — проверка, что напряжения нет в теле.
7. **Closure** — завершение, safe-place при остатке стресса.
8. **Reevaluation** — на следующей сессии, проверка устойчивости.

В нашей системе **+ RDI** как отдельная фаза `resource_development` (ставим после Preparation для пациентов с низкими ресурсами).

## Ключевые шкалы

| Шкала | Диапазон | Что измеряет | Целевое |
|---|---|---|---|
| **SUDS** (Subjective Units of Distress) | 0–10 | уровень страдания при представлении target | 0–1 на конце Desensitization |
| **VOC** (Validity of Cognition) | 1–7 | насколько PC ощущается «правдой» | 6–7 на конце Installation |

## Билатеральная стимуляция (BLS)

Альтернирующая стимуляция левого/правого полушария:
- **Visual** — точка движется по горизонтали (Three.js канвас).
- **Audio** — звук в наушниках попеременно слева/справа (Tone.js).
- **Tactile** — вибрация устройства (опционально).

В коде — 11 паттернов адаптивной длины сета (`packages/core/src/patterns/movements.ts`). После каждого сета — check-in (SUDS), затем next set / phase change.

## Adaptive set length

Длина сета (24–48 движений) выбирается орчестратором на основе:
- Текущего SUDS (high → длиннее).
- Voice-индикаторов (`flatAffect`, `hesitation`, `emotionalActivation`, `rushedSpeech`).
- Эмоциональных метрик с TF.js модели (`stress`, `valence`, `arousal`).
- Истории сессий пациента (`PatientContextService`).

## Safety / диссоциация

`SafetyMonitor` (`packages/emdr-engine/src/safety-monitor.ts`) детектирует диссоциативные эпизоды:
- Композитная метрика по эмоциям + voice-индикаторам.
- Adaptive baseline: первые N сэмплов формируют baseline, далее — отклонения.
- При detected → пауза BLS → grounding-инструкции → опционально SOS-уведомление терапевта/crisis-сервиса.

## Crisis pipeline

При выявлении (suicidal ideation в речи, panic attack по voice + face metrics):
1. Орчестратор → SafetyMonitor → CrisisService (NestJS).
2. CrisisService уведомляет назначенного терапевта (#148).
3. Пациенту показываем crisis-hotlines (10 стран + fallback) + SOS-кнопку.
4. Audit log: `CrisisEvent { severity, type, context, ... }`.

## Юридический контекст

- **HIPAA (US)** — PHI = любая информация о здоровье, идентифицирующая пациента. Шифруем at-rest и in-transit, audit log на доступ, BAA с подрядчиками.
- **GDPR (EU)** — Special Category Data: health data → требует explicit consent + право на стирание + DPO.
- **152-ФЗ (RU)** — данные о здоровье → требуется отдельное согласие, локализация хранения для РФ-пользователей (#data-localization).

## Что значит «безопасный» AI-фасилитатор

- Не выходит за рамки EMDR-протокола (не лечит депрессию советами и т. д.).
- Не назначает медикаменты, не диагностирует.
- Эскалирует к человеку при triggers (см. crisis pipeline).
- Прозрачен: пациент знает, что говорит AI.

## Связанные

- [`PRODUCT_CONTEXT.md`](PRODUCT_CONTEXT.md) — продуктовый контекст
- [`../GLOSSARY.md`](../GLOSSARY.md) — глоссарий
- [`../../docs/WHITEPAPER.md`](../WHITEPAPER.md) — теоретическое обоснование
- `packages/emdr-engine/` — реализация протокола
- `packages/core/src/patterns/movements.ts` — BLS-паттерны
