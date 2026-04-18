/**
 * Backend Client
 *
 * HTTP client for the NestJS API. Handles session persistence:
 * timeline events, emotion records, SUDS/VOC, and safety events.
 */

import type {
  EmotionSnapshot,
  SafetyEvent,
  ScaleRecord,
  TimelineEvent,
} from '@emdr42/emdr-engine';

export interface BackendSession {
  id: string;
  userId: string;
  status: string;
  currentPhase: string;
  [key: string]: unknown;
}

export class BackendClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  // -- Session operations --

  async createSession(data: {
    targetMemory?: string;
    blsPattern?: string;
    blsSpeed?: number;
  }): Promise<BackendSession> {
    return this.post('/sessions', data);
  }

  async updateSession(
    id: string,
    data: Record<string, unknown>
  ): Promise<BackendSession> {
    return this.patch(`/sessions/${id}`, data);
  }

  // -- Timeline --

  async addTimelineEvent(
    sessionId: string,
    event: TimelineEvent
  ): Promise<void> {
    await this.post(`/sessions/${sessionId}/timeline`, {
      timestamp: event.timestamp,
      type: event.type,
      data: event.data,
    });
  }

  // -- Emotions (batch) --

  async addEmotionRecords(
    sessionId: string,
    records: EmotionSnapshot[]
  ): Promise<void> {
    if (records.length === 0) return;

    const mapped = records.map((r) => ({
      timestamp: r.timestamp,
      stress: r.stress,
      engagement: r.engagement,
      positivity: r.positivity,
      arousal: r.arousal,
      valence: r.valence,
      joy: r.joy,
      sadness: r.sadness,
      anger: r.anger,
      fear: r.fear,
      confidence: r.confidence,
    }));

    await this.post(`/sessions/${sessionId}/emotions`, mapped);
  }

  // -- SUDS --

  async addSudsRecord(
    sessionId: string,
    record: ScaleRecord
  ): Promise<void> {
    await this.post(`/sessions/${sessionId}/suds`, {
      timestamp: record.timestamp,
      value: record.value,
      context: record.context,
    });
  }

  // -- VOC --

  async addVocRecord(
    sessionId: string,
    record: ScaleRecord
  ): Promise<void> {
    await this.post(`/sessions/${sessionId}/voc`, {
      timestamp: record.timestamp,
      value: record.value,
      context: record.context,
    });
  }

  // -- Safety --

  async addSafetyEvent(
    sessionId: string,
    event: SafetyEvent
  ): Promise<void> {
    await this.post(`/sessions/${sessionId}/safety`, {
      timestamp: event.timestamp,
      type: event.type,
      severity: event.severity,
      actionTaken: event.actionTaken,
      resolved: event.resolved,
    });
  }

  // -- Usage tracking (#130) --
  async recordUsage(payload: {
    userId?: string;
    sessionId?: string;
    provider: string;
    providerType: 'LLM' | 'TTS' | 'STT';
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
  }): Promise<void> {
    try {
      await this.post('/usage/record', payload);
    } catch {
      // usage logging — best effort, не ломаем flow
    }
  }

  // -- Crisis event (#147) --
  async recordCrisisEvent(payload: {
    sessionId?: string;
    severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    type: 'SUICIDE_IDEATION' | 'SELF_HARM' | 'DISSOCIATION' | 'PANIC' | 'OTHER';
    triggerText?: string;
  }): Promise<unknown> {
    return this.post('/crisis/report', payload);
  }

  // -- Patient context (#81) --
  async getPatientContext(): Promise<{
    prompt: string;
  }> {
    return this.get<{ prompt: string }>('/patient-context/me/prompt');
  }

  // -- Gamification events (#89) --
  async notifyGamificationEvent(event: {
    type: 'session_completed' | 'stop_signal' | 'crisis_resources';
    finalSuds?: number | null;
    finalVoc?: number | null;
    phasesCompleted?: number;
  }): Promise<void> {
    try {
      await this.post('/gamification/events', event);
    } catch {
      // best effort
    }
  }

  // -- HTTP helpers --

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      throw new Error(`Backend GET ${path} failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Backend POST ${path} failed (${res.status}): ${text}`
      );
    }

    return res.json() as Promise<T>;
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Backend PATCH ${path} failed (${res.status}): ${text}`
      );
    }

    return res.json() as Promise<T>;
  }
}
