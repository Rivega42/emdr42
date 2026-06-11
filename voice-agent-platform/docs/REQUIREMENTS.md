# Требования: паритет с ElevenLabs Agents + OpenClaw

Зафиксировано владельцем: «требования — как agents в 11labs (с возможностью
подключать openclaw инстансы)».

## 1. Матрица паритета с ElevenLabs Agents

| #   | Фича ElevenLabs                                   | Приоритет              | Реализация у нас                               |
| --- | ------------------------------------------------- | ---------------------- | ---------------------------------------------- |
| 1   | Agent config: system prompt, first message, язык  | P0                     | `AgentConfig` в core                           |
| 2   | Выбор LLM (GPT/Claude/Gemini/custom)              | P0                     | `LlmBackend` поверх providers (есть в emdr42)  |
| 3   | Выбор голоса + настройки (speed, stability)       | P0                     | `VoiceConfig`, TTS-адаптеры                    |
| 4   | ASR (распознавание) стриминговый                  | P0                     | Vosk (self-hosted) / faster-whisper / Deepgram |
| 5   | Turn-taking model (когда агент начинает говорить) | P0                     | VAD (Silero) + endpointing в `VoicePipeline`   |
| 6   | Interruption / barge-in (перебивание агента)      | P0                     | duck/cancel TTS при VAD-активности юзера       |
| 7   | Латентность ~ секунда до ответа                   | P0                     | стриминг каждого этапа, целевое TTFA < 800мс   |
| 8   | Client tools (вызов функций на клиенте)           | P1                     | `ToolConfig` type=client, события в SDK        |
| 9   | Server tools (webhooks во время диалога)          | P1                     | `ToolConfig` type=webhook                      |
| 10  | Knowledge base (RAG по документам)                | P2                     | этап 2                                         |
| 11  | Dynamic variables (подстановка в prompt)          | P1                     | `AgentConfig.variables`                        |
| 12  | Overrides (переопределение конфига на сессию)     | P1                     | `SessionOptions.overrides`                     |
| 13  | Телефония: входящие/исходящие SIP/Twilio          | P2                     | SIP-мост LiveKit, этап 2                       |
| 14  | Embeddable widget + SDK (JS/React/iOS/Android)    | P0 JS/React, P2 mobile | client-sdk                                     |
| 15  | История разговоров + транскрипты                  | P1                     | server: session log + storage hook             |
| 16  | Evaluation criteria / аналитика                   | P3                     | этап 3, dashboard                              |
| 17  | Multi-agent transfer (передача между агентами)    | P3                     | этап 3                                         |
| 18  | Multivoice (несколько голосов одного агента)      | P3                     | этап 3                                         |

## 2. OpenClaw-интеграция (ключевое отличие от 11labs)

[OpenClaw](https://openclaw.ai) — self-hosted персональный AI-ассистент (gateway
с WebSocket API, память, инструменты, мультиканальность).

**Требование:** агентом платформы может быть подключённый OpenClaw-инстанс —
голос становится ещё одним «каналом» для уже настроенного ассистента.

### Спека коннектора `OpenClawBackend`

- Подключение к gateway инстанса по WebSocket (`url` + `token` в конфиге агента)
- Реплика пользователя (final transcript) → сообщение в OpenClaw-сессию
- Стриминговые чанки ответа OpenClaw → сразу в TTS (не ждать полного ответа)
- Поддержка прерывания: barge-in отменяет текущую генерацию (abort upstream)
- Tool-calls исполняет сам OpenClaw — платформа их не интерпретирует,
  но прокидывает статусные события в UI («агент думает / выполняет действие»)
- Сессионность: `conversationId` маппится на OpenClaw-сессию, память живёт
  на стороне инстанса
- Деградация: если инстанс недоступен → понятная ошибка в SDK + опциональный
  fallback на `LlmBackend`

### Открытые вопросы по OpenClaw

- [ ] Какая версия gateway-протокола фиксируется (semver-диапазон)?
- [ ] Аутентификация: токен в конфиге агента или OAuth-flow для юзеров?
- [ ] Нужен ли voice-канал в самом OpenClaw (plugin) или только внешний коннектор?

## 3. User stories из трёх проектов

> TODO(владелец): вписать 2 других проекта, чтобы зафиксировать их требования.

1. **emdr42** — AI-терапевт: голосовой диалог во время EMDR-сессии, пайплайн
   Vosk → LLM → Piper, barge-in при ai_speaking, эмоциональный контекст
   подмешивается в prompt (передаётся через `SessionOptions.overrides`).
2. **Проект 2** — ?
3. **Проект 3** — ?

## 4. Нефункциональные требования

- Self-hosted first: полный стек поднимается docker-compose'ом без внешних API
  (Vosk + локальный LLM/OpenClaw + Piper)
- Премиум-провайдеры (ElevenLabs TTS, Deepgram) — опциональные адаптеры
- Server stateless: сессии в Redis, горизонтальное масштабирование
- TTFA (time to first audio) < 800мс на локальном стеке
- Лицензия ядра: MIT (open-core; dashboard может быть коммерческим — решить)
