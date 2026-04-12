/**
 * @emdr42/emdr-engine
 *
 * EMDR 8-phase session engine with safety protocols,
 * adaptive BLS, session comparison, and AI prompt templates.
 */

// Types
export type {
  BlsConfig,
  BlsType,
  EmdrPhase,
  EmdrSessionState,
  EmotionSnapshot,
  FullSessionExport,
  Intervention,
  InterventionPriority,
  InterventionType,
  PhaseTransition,
  ProgressSummary,
  RiskLevel,
  SafetyAnalysis,
  SafetyEvent,
  SafetyEventType,
  SafetyThresholds,
  ScaleRecord,
  SessionComparison,
  Severity,
  TargetMemory,
  TimelineEvent,
  TimelineEventType,
  TrendAnalysis,
} from './types';

// Engine
export { EmdrSessionEngine } from './session-engine';

// Safety
export { SafetyMonitor } from './safety-monitor';

// Adaptive controller
export { AdaptiveController } from './adaptive-controller';

// Session comparator
export { SessionComparator } from './session-comparator';

// Prompt templates
export {
  EMDR_SYSTEM_PROMPT,
  INTERWEAVE_PROMPTS,
  PHASE_PROMPTS,
  SAFETY_PROMPTS,
} from './prompt-templates';
