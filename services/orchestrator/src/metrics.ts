// eslint-disable-next-line @typescript-eslint/no-var-requires
const client = require('prom-client');

/**
 * Prometheus метрики для Orchestrator (#83).
 *
 * Включает:
 *   - Active WebSocket connections
 *   - Active sessions (из SessionRegistry)
 *   - Voice pipeline latency (STT, LLM, TTS stages)
 *   - AI provider errors / circuit breaker states
 *   - Emotion snapshots processed
 */

client.collectDefaultMetrics({ prefix: 'emdr42_orchestrator_' });

export const metrics = {
  register: client.register,

  wsConnections: new client.Gauge({
    name: 'orchestrator_ws_connections',
    help: 'Active WebSocket connections',
  }),

  activeSessions: new client.Gauge({
    name: 'orchestrator_active_sessions',
    help: 'Active EMDR sessions held in registry',
  }),

  activeVoice: new client.Gauge({
    name: 'orchestrator_active_voice_handlers',
    help: 'Active voice handlers held in registry',
  }),

  // Voice pipeline stages (#83)
  sttLatencyMs: new client.Histogram({
    name: 'orchestrator_stt_latency_ms',
    help: 'STT transcription latency (ms)',
    labelNames: ['provider'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
  }),

  llmLatencyMs: new client.Histogram({
    name: 'orchestrator_llm_latency_ms',
    help: 'LLM response first-token latency (ms)',
    labelNames: ['provider'],
    buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 30000],
  }),

  ttsLatencyMs: new client.Histogram({
    name: 'orchestrator_tts_latency_ms',
    help: 'TTS synthesis latency (ms)',
    labelNames: ['provider'],
    buckets: [50, 100, 250, 500, 1000, 2000, 5000],
  }),

  voiceEndToEndLatencyMs: new client.Histogram({
    name: 'orchestrator_voice_e2e_latency_ms',
    help: 'End-to-end voice turn latency: user speech end → AI speech start',
    buckets: [500, 1000, 1500, 2000, 3000, 5000, 10000],
  }),

  emotionSnapshots: new client.Counter({
    name: 'orchestrator_emotion_snapshots_total',
    help: 'Emotion snapshots received from clients',
  }),

  safetyEvents: new client.Counter({
    name: 'orchestrator_safety_events_total',
    help: 'Safety events triggered during sessions',
    labelNames: ['type', 'severity'],
  }),

  aiProviderErrors: new client.Counter({
    name: 'orchestrator_ai_errors_total',
    help: 'AI provider errors',
    labelNames: ['provider', 'type'],
  }),

  circuitState: new client.Gauge({
    name: 'ai_provider_circuit_state',
    help: 'Circuit breaker state (1=CLOSED, 0.5=HALF_OPEN, 0=OPEN)',
    labelNames: ['provider', 'state'],
  }),
};

export const metricsHandler = async (): Promise<{
  contentType: string;
  body: string;
}> => {
  return {
    contentType: metrics.register.contentType,
    body: await metrics.register.metrics(),
  };
};
