# Архитектура

## Поток данных одной реплики

```
Клиент (mic) ──audio──► Transport ──► VAD ──► STT(stream) ──final──► AgentBackend
                                      │                                  │
                                      │ barge-in (speaking=true          │ text_delta
                                      │  во время речи агента)           ▼
Клиент (spk) ◄──audio── Transport ◄── abort ◄──────────────── TTS(stream)
```

1. Аудио юзера течёт в VAD и STT параллельно.
2. VAD даёт endpointing: тишина `endpointingMs` после речи → STT-финализация →
   реплика уходит в `AgentBackend.respond()`.
3. `text_delta`-чанки бэкенда сразу уходят в стриминговый TTS — первый аудио-чанк
   у клиента до завершения генерации ответа (цель TTFA < 800мс).
4. Barge-in: VAD-активность юзера во время речи агента → `AbortSignal` в бэкенд,
   сброс TTS-очереди, событие `interrupted`, ход возвращается юзеру.

## Ключевые контракты

| Контракт                                 | Файл                     | Зачем                                        |
| ---------------------------------------- | ------------------------ | -------------------------------------------- |
| `AgentBackend`                           | `core/src/backend.ts`    | Мозг агента: LLM / OpenClaw / кастом         |
| `SttAdapter`, `TtsAdapter`, `VadAdapter` | `core/src/pipeline.ts`   | Подключаемые провайдеры                      |
| `Transport`                              | `transport/src/index.ts` | LiveKit / WebSocket — пайплайну всё равно    |
| `AgentConfig`                            | `core/src/types.ts`      | Декларативный конфиг агента (паритет 11labs) |

## Почему AgentBackend, а не «LLM с настройками»

OpenClaw-инстанс — не LLM: у него своя память, свои тулы, своя петля агента.
Пытаться выразить его через «LLM + tools» — протечка абстракции. Контракт
`respond(input) → stream<events>` покрывает оба случая, а tool-исполнение
остаётся на стороне бэкенда (OpenClaw исполняет сам; LlmBackend исполняет
через ToolConfig платформы).

## План извлечения из emdr42

| Этап | Что                                           | Откуда                         |
| ---- | --------------------------------------------- | ------------------------------ |
| 1    | LLM/TTS/STT адаптеры + fallback-цепочки       | `packages/ai-providers`        |
| 1    | Voice pipeline (механика, без EMDR)           | `services/orchestrator`        |
| 1    | LiveKit utils                                 | `packages/livekit-integration` |
| 2    | Клиентский захват + barge-in                  | `lib/voice-capture.ts`         |
| 2    | React WebRTC hook                             | `lib/use-livekit.ts`           |
| 2    | VAD (Silero) + endpointing                    | новое                          |
| 3    | OpenClawBackend по зафиксированному протоколу | новое                          |
| 3    | Миграция emdr42 на client-sdk                 | валидация переиспользуемости   |

Тесты переносятся вместе с кодом (в emdr42 у этих модулей 117 + 39 спеков).
