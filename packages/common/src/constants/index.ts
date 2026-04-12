/** Порты сервисов */
export const SERVICE_PORTS = {
  GATEWAY: 8000,
  API: 3001,
  ORCHESTRATOR: 8002,
  AUTH: 3010,
  SESSIONS: 3011,
  EMOTIONS: 3012,
  NOTIFICATIONS: 3013,
  ANALYTICS: 3014,
} as const;

/** Маршруты API Gateway */
export const GATEWAY_ROUTES = {
  '/api/auth': `http://localhost:${SERVICE_PORTS.API}`,
  '/api/sessions': `http://localhost:${SERVICE_PORTS.API}`,
  '/api/users': `http://localhost:${SERVICE_PORTS.API}`,
  '/api/admin': `http://localhost:${SERVICE_PORTS.API}`,
  '/api/health': `http://localhost:${SERVICE_PORTS.API}`,
  '/api/livekit': `http://localhost:${SERVICE_PORTS.API}`,
  '/ws': `http://localhost:${SERVICE_PORTS.ORCHESTRATOR}`,
} as const;

/** Фазы EMDR-протокола */
export const EMDR_PHASES = [
  'HISTORY', 'PREPARATION', 'ASSESSMENT',
  'DESENSITIZATION', 'INSTALLATION', 'BODY_SCAN',
  'CLOSURE', 'REEVALUATION',
] as const;

/** BLS-фазы (визуализация активна) */
export const BLS_PHASES = ['DESENSITIZATION', 'INSTALLATION', 'BODY_SCAN'] as const;

/** SUDS шкала */
export const SUDS_RANGE = { min: 0, max: 10 } as const;

/** VOC шкала */
export const VOC_RANGE = { min: 1, max: 7 } as const;
