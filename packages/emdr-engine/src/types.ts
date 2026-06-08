/**
 * EMDR Session Engine — Type Definitions
 *
 * All interfaces for the 8-phase EMDR protocol engine,
 * safety monitoring, adaptive BLS, and session comparison.
 */

// ---------------------------------------------------------------------------
// Phase & Session State
// ---------------------------------------------------------------------------

export type EmdrPhase =
  | 'history'
  | 'preparation'
  | 'resource_development' // #131 RDI — Resource Development & Installation (EMDRIA standard)
  | 'assessment'
  | 'desensitization'
  | 'installation'
  | 'body_scan'
  | 'closure'
  | 'reevaluation';

/**
 * Канонический порядок фаз EMDR-протокола (EMDRIA).
 * Phase 2.5 `resource_development` опциональна — выполняется если пациент
 * недостаточно stabilized в preparation (низкий engagement, crisis history).
 */
export const EMDR_PHASE_ORDER: EmdrPhase[] = [
  'history',
  'preparation',
  'resource_development',
  'assessment',
  'desensitization',
  'installation',
  'body_scan',
  'closure',
  'reevaluation',
];

export interface EmdrSessionState {
  sessionId: string;
  userId: string;
  currentPhase: EmdrPhase;
  phaseHistory: PhaseTransition[];
  target: TargetMemory | null;
  sudsHistory: ScaleRecord[];
  vocHistory: ScaleRecord[];
  emotionTrack: EmotionSnapshot[];
  timelineEvents: TimelineEvent[];
  safetyEvents: SafetyEvent[];
  blsConfig: BlsConfig;
  blsSetsCompleted: number;
  isActive: boolean;
  isPaused: boolean;
  startedAt: number;
  elapsedSeconds: number;
}

export interface PhaseTransition {
  from: EmdrPhase;
  to: EmdrPhase;
  timestamp: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Target Memory
// ---------------------------------------------------------------------------

export interface TargetMemory {
  description: string;
  image: string;
  negativeCognition: string;
  ncDomain: 'responsibility' | 'self_worth' | 'safety' | 'control';
  positiveCognition: string;
  initialEmotions: string[];
  bodyLocation: string;
}

// ---------------------------------------------------------------------------
// Scales (SUDS / VOC)
// ---------------------------------------------------------------------------

export interface ScaleRecord {
  timestamp: number;
  value: number;
  context: string;
}

// ---------------------------------------------------------------------------
// Emotion Tracking
// ---------------------------------------------------------------------------

export interface EmotionSnapshot {
  timestamp: number;
  stress: number;
  engagement: number;
  positivity: number;
  arousal: number;
  valence: number;
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export type TimelineEventType =
  | 'phase_start'
  | 'phase_end'
  | 'ai_utterance'
  | 'patient_utterance'
  | 'bls_start'
  | 'bls_stop'
  | 'bls_adapt'
  | 'suds_recorded'
  | 'voc_recorded'
  | 'safety_alert'
  | 'grounding_started'
  | 'interweave';

export interface TimelineEvent {
  timestamp: number;
  type: TimelineEventType;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

export type SafetyEventType =
  | 'dissociation'
  | 'stop_signal'
  | 'abreaction'
  | 'window_exceeded'
  | 'crisis'
  | 'high_stress';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface SafetyEvent {
  timestamp: number;
  type: SafetyEventType;
  severity: Severity;
  actionTaken: string;
  resolved: boolean;
}

export interface SafetyThresholds {
  dissociationAttentionMin: number;
  dissociationEngagementMin: number;
  stressCritical: number;
  stressHigh: number;
  abreactionArousalThreshold: number;
  maxSetsWithoutProgress: number;
}

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface SafetyAnalysis {
  safe: boolean;
  riskLevel: RiskLevel;
  events: SafetyEvent[];
  intervention: Intervention | null;
}

export type InterventionType =
  | 'continue'
  | 'slow_bls'
  | 'grounding_54321'
  | 'safe_place'
  | 'container'
  | 'breathing'
  | 'pause'
  | 'end_session'
  | 'crisis_protocol';

export type InterventionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Intervention {
  type: InterventionType;
  instructions: string;
  priority: InterventionPriority;
}

// ---------------------------------------------------------------------------
// BLS Configuration
// ---------------------------------------------------------------------------

export type BlsType = 'eye_movement' | 'tapping' | 'auditory' | 'combined';

export interface BlsConfig {
  pattern: string;
  speed: number;
  setLength: number;
  type: BlsType;
}

// ---------------------------------------------------------------------------
// Session Comparison & Progress
// ---------------------------------------------------------------------------

export interface SessionComparison {
  currentSessionId: string;
  previousSessionId: string;
  sudsDelta: number;
  vocDelta: number;
  avgStressDelta: number;
  avgEngagementDelta: number;
  effectivenessScore: number;
  improvements: string[];
  concerns: string[];
}

export interface FullSessionExport {
  sessionId: string;
  userId: string;
  startedAt: number;
  endedAt: number;
  elapsedSeconds: number;
  phases: PhaseTransition[];
  target: TargetMemory | null;
  sudsHistory: ScaleRecord[];
  vocHistory: ScaleRecord[];
  emotionTrack: EmotionSnapshot[];
  timeline: TimelineEvent[];
  safetyEvents: SafetyEvent[];
  blsSetsCompleted: number;
  closureTechnique: string;
  clientStateAtEnd: string;
}

export interface ProgressSummary {
  totalSessions: number;
  avgSudsDrop: number;
  avgVocGain: number;
  overallEffectiveness: number;
  sessionsWithSafetyEvents: number;
  completionRate: number;
  summary: string;
}

export interface TrendAnalysis {
  sudsOverTime: Array<{ sessionId: string; startSuds: number; endSuds: number }>;
  vocOverTime: Array<{ sessionId: string; startVoc: number; endVoc: number }>;
  stressOverTime: Array<{ sessionId: string; avgStress: number }>;
  direction: 'improving' | 'stable' | 'declining';
  confidence: number;
}
