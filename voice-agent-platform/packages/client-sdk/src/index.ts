/**
 * Браузерный SDK + React hooks.
 *
 * Целевой API (паритет с @elevenlabs/react useConversation):
 *
 *   const agent = useVoiceAgent({
 *     agentId: 'my-agent',
 *     serverUrl: 'wss://voice.example.com',
 *     overrides: { variables: { userName: 'Roman' } },
 *   });
 *   agent.start();     // getUserMedia + коннект
 *   agent.stop();
 *   agent.state;       // 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'
 *   agent.transcript;  // живой транскрипт диалога
 *   agent.registerClientTool('openModal', async (args) => {...});
 *
 * TODO(extract): перенести из emdr42:
 * - lib/voice-capture.ts (MediaRecorder lifecycle, barge-in, 18 тестов)
 * - lib/use-livekit.ts (WebRTC room, 21 тест)
 */
export {};
