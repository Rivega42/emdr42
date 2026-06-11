# Voice Agent Platform

Self-hosted платформа голосовых AI-агентов реального времени — разговор «как по телефону».
Функциональный аналог [ElevenLabs Agents](https://elevenlabs.io/agents) с ключевым отличием:
**мозгом агента может быть не только LLM, но и ваш [OpenClaw](https://openclaw.ai)-инстанс** —
с его памятью, инструментами и персоной.

## Зачем

Это третий проект, где нужен WebRTC-агент для голосового диалога. Вместо повторной сборки
пайплайна `VAD → STT → Agent → TTS` в каждом проекте — одна платформа, подключаемая через SDK.

## Возможности (целевые)

| Фича                                                                      | Статус                               |
| ------------------------------------------------------------------------- | ------------------------------------ |
| Конфигурируемые агенты (prompt, голос, язык, first message)               | scaffold                             |
| Подключаемые LLM (Claude, GPT, локальные) с fallback-цепочками            | переносится из emdr42 `ai-providers` |
| **OpenClaw-бэкенд**: агент = ваш OpenClaw-инстанс (память, тулы, персона) | scaffold                             |
| Подключаемые голоса: Piper (free, self-hosted), ElevenLabs, OpenAI TTS    | переносится из emdr42                |
| STT: Vosk (self-hosted), faster-whisper, Deepgram                         | переносится из emdr42                |
| Turn-taking + barge-in (перебивание агента)                               | scaffold                             |
| Латентность < 800мс до первого аудио (стриминг на каждом этапе)           | цель                                 |
| Транспорт: LiveKit (WebRTC) / WebSocket                                   | переносится из emdr42                |
| Client SDK: JS/TS + React hooks (`useVoiceAgent`)                         | scaffold                             |
| Server tools (webhooks) + client tools — function calling из диалога      | план                                 |
| Телефония (SIP через LiveKit)                                             | план, этап 2                         |
| Knowledge base (RAG)                                                      | план, этап 2                         |
| Dashboard управления агентами                                             | план, этап 3                         |

## Архитектура

```
┌─────────────┐   WebRTC/WS    ┌──────────────────────────────────────┐
│  client-sdk │◄──────────────►│             server                   │
│ useVoiceAgent│               │  ┌─────┐ ┌─────┐ ┌───────┐ ┌─────┐  │
└─────────────┘                │  │ VAD │→│ STT │→│ Agent │→│ TTS │  │
                               │  └─────┘ └─────┘ │Backend│ └─────┘  │
                               │   barge-in ◄─────┴───┬───┘          │
                               └──────────────────────┼──────────────┘
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    ▼                 ▼                 ▼
                              LlmBackend       OpenClawBackend    (свой бэкенд)
                              Claude/GPT/…      ws://ваш-инстанс   implements
                                                                  AgentBackend
```

Ключевая абстракция — `AgentBackend` (`packages/core/src/backend.ts`): пайплайн не знает,
кто отвечает — голый LLM или полноценный OpenClaw-агент с памятью и инструментами.

## Структура

```
packages/
├── core/         # Типы, AgentBackend, VoicePipeline (оркестрация turn-taking)
├── providers/    # STT/TTS/LLM адаптеры + OpenClawBackend
├── transport/    # LiveKit / WebSocket транспорт
├── client-sdk/   # Браузерный SDK + React hooks
└── server/       # Session server (stateless, горизонтально масштабируемый)
apps/
└── playground/   # Демо-интерфейс для теста агентов (план)
docs/
├── ARCHITECTURE.md
└── REQUIREMENTS.md   # Паритет с ElevenLabs + спека OpenClaw-коннектора
```

## Происхождение кода

~70% строительных блоков переносится из [emdr42](https://github.com/Rivega42/emdr42)
(см. issue Rivega42/emdr42#268):

- `packages/ai-providers` — LLM/TTS/STT абстракции, fallback-цепочки (117 тестов)
- `services/orchestrator` — voice pipeline Vosk → LLM → Piper
- `lib/voice-capture.ts`, `lib/use-livekit.ts` — клиентская часть (39 тестов)

EMDR-доменная логика **не переносится** — она остаётся в emdr42, который станет
первым потребителем этого SDK.

## Старт разработки

```bash
pnpm install
pnpm -r build
pnpm -r test
```

Node.js 20+, pnpm 9+.
