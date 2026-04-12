export type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'ABORTED';
export type EmdrPhase = 'HISTORY' | 'PREPARATION' | 'ASSESSMENT' | 'DESENSITIZATION' | 'INSTALLATION' | 'BODY_SCAN' | 'CLOSURE' | 'REEVALUATION';

export interface Session {
  id: string;
  userId: string;
  sessionNumber: number;
  status: SessionStatus;
  phase: EmdrPhase;
  targetMemory?: string;
  negativeCognition?: string;
  positiveCognition?: string;
  sudsBaseline?: number;
  sudsFinal?: number;
  vocBaseline?: number;
  vocFinal?: number;
  blsPattern: string;
  blsSpeed: number;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface EmotionSnapshot {
  timestamp: number;
  stress: number;
  engagement: number;
  positivity: number;
  arousal: number;
  valence: number;
  dominant?: string;
  confidence: number;
}
