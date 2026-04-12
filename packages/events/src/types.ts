/** Типы событий платформы EMDR42 */

export interface SessionStartedEvent {
  type: 'session.started';
  data: { sessionId: string; userId: string; phase: string };
}

export interface SessionEndedEvent {
  type: 'session.ended';
  data: { sessionId: string; duration: number; phasesCompleted: number };
}

export interface EmotionUpdateEvent {
  type: 'session.emotion';
  data: { sessionId: string; stress: number; engagement: number; timestamp: number };
}

export interface SafetyAlertEvent {
  type: 'session.safety_alert';
  data: { sessionId: string; riskLevel: string; type: string; severity: string };
}

export interface PhaseChangedEvent {
  type: 'session.phase_changed';
  data: { sessionId: string; from: string; to: string; reason: string };
}

export type PlatformEvent =
  | SessionStartedEvent
  | SessionEndedEvent
  | EmotionUpdateEvent
  | SafetyAlertEvent
  | PhaseChangedEvent;
