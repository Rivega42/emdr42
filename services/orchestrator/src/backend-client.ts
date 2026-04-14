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

  // -- HTTP helpers --

  /** Fetch patient's previous sessions for cross-session context. */
  async getPatientSessions(
    userId: string,
    limit = 5
  ): Promise<Array<{
    id: string;
    sessionNumber: number;
    sudsBaseline: number | null;
    sudsFinal: number | null;
    vocBaseline: number | null;
    vocFinal: number | null;
    durationSeconds: number | null;
    status: string;
    createdAt: string;
  }>> {
    try {
      const res = await fetch(
        `${this.baseUrl}/users/${userId}/sessions?limit=${limit}&page=1`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
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
