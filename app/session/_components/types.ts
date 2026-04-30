export type EmdrPhase =
  | 'history'
  | 'preparation'
  | 'resource_development'
  | 'assessment'
  | 'desensitization'
  | 'installation'
  | 'body_scan'
  | 'closure'
  | 'reevaluation';

export interface ChatMessage {
  id: string;
  role: 'ai' | 'patient';
  text: string;
  streaming?: boolean;
}

export interface BlsConfig {
  pattern: string;
  speed: number;
  setLength?: number;
  paused?: boolean;
}

export interface SafetyAlertData {
  riskLevel: string;
  events: { type: string; severity: string; actionTaken: string }[];
}

export interface InterventionData {
  type: string;
  instructions: string;
  priority: string;
  riskLevel: string;
}

export interface SessionEndedData {
  sessionId: string;
  elapsedSeconds: number;
  blsSetsCompleted: number;
  finalSuds: number | null;
  finalVoc: number | null;
  phasesCompleted: number;
  safetyEventsCount: number;
}

export const PHASE_META: Record<EmdrPhase, { label: string; group: 'pre' | 'bls' | 'post' }> = {
  history:              { label: 'History',              group: 'pre' },
  preparation:          { label: 'Preparation',          group: 'pre' },
  resource_development: { label: 'Resource Dev.',        group: 'pre' },
  assessment:           { label: 'Assessment',           group: 'pre' },
  desensitization:      { label: 'Desensitization',      group: 'bls' },
  installation:         { label: 'Installation',         group: 'bls' },
  body_scan:            { label: 'Body Scan',            group: 'bls' },
  closure:              { label: 'Closure',              group: 'post' },
  reevaluation:         { label: 'Reevaluation',         group: 'post' },
};

export const PHASE_ORDER: EmdrPhase[] = [
  'history', 'preparation', 'resource_development', 'assessment',
  'desensitization', 'installation', 'body_scan',
  'closure', 'reevaluation',
];

export const BLS_PHASES: EmdrPhase[] = ['desensitization', 'installation', 'body_scan'];

export const PATTERNS = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'infinity',   label: 'Infinity' },
  { value: 'diagonal',   label: 'Diagonal' },
  { value: 'circular',   label: 'Circular' },
  { value: 'butterfly',  label: 'Butterfly' },
  { value: 'spiral',     label: 'Spiral' },
  { value: 'wave',       label: 'Wave' },
  { value: 'lissajous',  label: 'Lissajous' },
  { value: 'pendulum',   label: 'Pendulum' },
  { value: 'random_smooth', label: 'Random Smooth' },
] as const;

export { formatTime } from '@/lib/formatters';
