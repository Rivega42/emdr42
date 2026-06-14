# Статус механик EMDR / ИИ / эмоций / адаптации

**Обновлено:** 2026-06-14 · ветка `fix/emdr-loop-prod`

Живой статус ключевых механик: насколько они реальны в коде и работают ли на
проде. Источник — полномасштабное ревью (45 агентов) + применённые фиксы P0/P1.
Держать актуальным при изменениях движка/оркестратора/эмоций.

## Краткий статус

| Механика | В коде / dev | На проде emdr42.ru | После фиксов P0/P1 |
|---|---|---|---|
| EMDR-движок + BLS-рендер | 🟢 реально | 🟢 работает | 🟢 |
| Распознавание эмоций (face-api.js) | 🟢 реальная нейросеть | 🔴 было: CSP блок весов | 🟢 self-host (P0) |
| Адаптивная петля эмоция→BLS на лету | 🟢 замкнута, реальная математика | 🔴 было: питалась нулями | 🟢 (вход восстановлен) |
| Формула stress | 🔴 было: зажата в 0.333 | 🔴 пороги недостижимы | 🟢 фикс (P1) |
| Эскалация кризиса (window_exceeded) | 🔴 было: не доходила до терапевта | 🔴 | 🟢 фикс (P1) |
| Персистентность телеметрии | 🔴 было: 404, потеря данных | 🔴 | 🟢 фикс session-ID (P1) |
| ИИ-диалог терапевта (LLM) | 🟢 реальный стриминг SDK | 🟡 нужен ключ + явный баннер | 🟡 баннер (P1), ключ — деплой |
| Голос STT/TTS | 🟡 код реальный | 🔴 нет vosk/piper + разрыв | 🔴 P2 (не сделано) |

## Адаптивная петля (ядро)

Реальная, на настоящих данных инференции (не mock, не random):

```
камера → face-api.js (tinyFaceDetector + faceExpressionNet)
       → stress/valence/engagement [emotion-recognition.ts]
       → socket session:emotion (throttle 1 Гц) [app/session/page.tsx]
       → session-handler.handleEmotion [orchestrator]
       → AdaptiveController.calculateBlsParams (stress>0.75→speed×0.8;
         engagement<0.3→speed×1.1; clamp 0.4–1.5 Гц) [emdr-engine]
       → engine.adaptBls → emit session:bls_config
       → SessionCanvas меняет BLS на лету (Three.js)
```

Ограничения (by design): адаптация по эмоциям активна в фазах `desensitization`
и `installation`; требует камеру + consent; частота 1 Гц.

## Что чинили (P0/P1, эта ветка)

- **P0 — эмоции на проде**: веса/библиотека face-api self-hosted в `public/models`
  и `public/vendor` (`MODEL_URL='/models'`), jsdelivr убран из CSP. Раньше веса
  грузились fetch'ем с CDN, а `connect-src` его не содержал → инференс не стартовал.
  Переполучение: `scripts/fetch-face-models.sh`.
- **P1 — формула stress**: `Math.min(1, sum)/3` → `Math.min(1, sum/3)`
  (`emotion-recognition.ts`). Раньше stress ≤ 0.333, пороги 0.75/0.8/0.85 недостижимы.
- **P1 — эскалация кризиса**: `getIntervention` поднимает priority до `critical`
  при `severity==='critical'`; `window_exceeded` добавлен в gate эскалации
  (→ PANIC); `ABREACTION` добавлен в DTO `crisis.controller`.
- **P1 — session-ID mismatch**: `backendSessionId`/`persistId` — записи в БД идут
  на id из `createSession`, а не на клиентский (раньше 404, потеря телеметрии).
- **P1 — сигнал «ИИ недоступен»**: `AiRouter.hasLlm()`; при отсутствии провайдера
  оркестратор эмитит `session:ai_status{available:false}`, фронт показывает
  спокойный баннер вместо вечной техошибки.

## Сделано дополнительно (P2, эта же ветка)

- **Запись SUDS/VOC + контракт session-записей** (`session-handler.saveToBackend`,
  phase-update): поля и регистр приведены к `UpdateSessionDto` (status `COMPLETED`,
  `durationSeconds`, `phase`), добавлены `sudsBaseline/Final`, `vocBaseline/Final`.
  Раньше эти записи 400-ли (не только из-за session-ID, но и из-за имён/регистра
  полей) → аналитика и progress всегда пусты.
- **Crisis-баннер в сессии**: телефон доверия добавлен в safety-alert модалку —
  виден в острый момент (раньше только статично на dashboard).

## Осталось (следующие проходы)

- **Деплой — ключ LLM**: прописать `ANTHROPIC_API_KEY` (или `OPENAI_API_KEY`)
  в серверном `.env` оркестратора. Код готов; без ключа ИИ-диалог недоступен
  (явно сигналится баннером).
- **P2 — голос STT/TTS**: поднять vosk/piper ИЛИ переписать `VoiceHandler` на
  `DeepgramProvider.transcribeStream()` (нужен декод Opus→PCM, ключ Deepgram).
  Сейчас `VoiceHandler` ходит в Vosk/Piper напрямую, минуя облачные провайдеры.
- **P3 — гигиена**: убрать мёртвый код (`lib/edge-inference.ts`,
  `app/session/_components/*`), подключить или удалить заглушку trpc sessions router.
- **P3 — timestamp в `getEmotionalPeaks`** (`*1000`): абсолютное значение
  «кривое» (эмоции хранятся как epoch-мс, не сек-от-старта), НО emotion/timeline/
  suds масштабируются одинаково → привязка пиков к фазам консистентна и не
  ломается. Требует более глубокой проверки перед изменением — отложено, чтобы
  не внести регрессию.
