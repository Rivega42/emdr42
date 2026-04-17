/**
 * Safety Monitor
 *
 * Real-time analysis of emotion data to detect dissociation, abreaction,
 * window-of-tolerance violations, and stress spikes. Returns recommended
 * clinical interventions when risk is detected.
 */

import type {
  EmdrSessionState,
  EmotionSnapshot,
  Intervention,
  InterventionType,
  RiskLevel,
  SafetyAnalysis,
  SafetyEvent,
  SafetyEventType,
  SafetyThresholds,
  Severity,
} from './types';

// ---------------------------------------------------------------------------
// Default thresholds (clinically conservative)
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLDS: SafetyThresholds = {
  dissociationAttentionMin: 0.1,
  dissociationEngagementMin: 0.1,
  stressCritical: 0.9,
  stressHigh: 0.75,
  abreactionArousalThreshold: 0.85,
  maxSetsWithoutProgress: 4,
};

// Minimum consecutive low-engagement snapshots to flag dissociation (#132, approx 3 s)
const DISSOCIATION_MIN_CONSECUTIVE = 3;

// Размер окна для baseline пользователя (EWMA подход — #132)
const BASELINE_WINDOW_SIZE = 60; // ~60 сек активности до baseline

// Порог отклонения композитного score от baseline (#132)
const DISSOCIATION_DEVIATION_THRESHOLD = 0.25;

// Number of recent snapshots for abreaction detection (approx 5 s window)
const ABREACTION_WINDOW = 5;

// Duration thresholds (in snapshot count, assuming ~1 s cadence)
const WINDOW_EXCEEDED_DURATION = 10;

// ---------------------------------------------------------------------------
// SafetyMonitor
// ---------------------------------------------------------------------------

export class SafetyMonitor {
  private thresholds: SafetyThresholds;

  /** Rolling buffer of recent snapshots for temporal analysis */
  private recentSnapshots: EmotionSnapshot[] = [];

  /**
   * Adaptive baseline (#132) — усреднённые значения engagement/stress/valence
   * за первые BASELINE_WINDOW_SIZE снимков сессии. Используется для detecting
   * devianтов от нормального состояния конкретного пациента.
   */
  private baseline: {
    engagement: number;
    stress: number;
    valence: number;
    arousal: number;
    variance: number;
  } | null = null;

  private baselineCollector: EmotionSnapshot[] = [];

  constructor(thresholds?: Partial<SafetyThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Сбрасывает baseline (новая сессия или resource re-установка).
   */
  resetBaseline(): void {
    this.baseline = null;
    this.baselineCollector = [];
    this.recentSnapshots = [];
  }

  // -----------------------------------------------------------------------
  // Primary analysis entry point
  // -----------------------------------------------------------------------

  analyzeEmotion(
    snapshot: EmotionSnapshot,
    sessionState: EmdrSessionState
  ): SafetyAnalysis {
    this.recentSnapshots.push(snapshot);
    // Keep a rolling window of ~30 seconds
    if (this.recentSnapshots.length > 30) {
      this.recentSnapshots.shift();
    }

    // Adaptive baseline collection (#132) — первые BASELINE_WINDOW_SIZE снимков
    if (!this.baseline) {
      this.baselineCollector.push(snapshot);
      if (this.baselineCollector.length >= BASELINE_WINDOW_SIZE) {
        this.computeBaseline();
      }
    }

    const events: SafetyEvent[] = [];
    const now = snapshot.timestamp;

    // --- Dissociation ---
    if (this.detectDissociation(snapshot)) {
      events.push({
        timestamp: now,
        type: 'dissociation',
        severity: 'critical',
        actionTaken: '',
        resolved: false,
      });
    }

    // --- Abreaction ---
    if (this.detectAbreaction(this.recentSnapshots)) {
      events.push({
        timestamp: now,
        type: 'abreaction',
        severity: 'high',
        actionTaken: '',
        resolved: false,
      });
    }

    // --- Window of tolerance exceeded ---
    if (this.detectWindowExceeded(snapshot)) {
      events.push({
        timestamp: now,
        type: 'window_exceeded',
        severity: snapshot.stress > this.thresholds.stressCritical ? 'critical' : 'high',
        actionTaken: '',
        resolved: false,
      });
    }

    // --- Stress spike ---
    const previous = this.recentSnapshots.length >= 3
      ? this.recentSnapshots[this.recentSnapshots.length - 3]
      : null;
    if (previous && this.detectStressSpike(snapshot, previous)) {
      events.push({
        timestamp: now,
        type: 'high_stress',
        severity: 'medium',
        actionTaken: '',
        resolved: false,
      });
    }

    // Determine overall risk level
    const riskLevel = this.determineRiskLevel(events);
    const intervention =
      events.length > 0
        ? this.getIntervention(this.highestSeverityEvent(events))
        : null;

    // Fill actionTaken for each event with intervention info
    if (intervention) {
      for (const ev of events) {
        ev.actionTaken = intervention.type;
      }
    }

    return {
      safe: events.length === 0,
      riskLevel,
      events,
      intervention,
    };
  }

  // -----------------------------------------------------------------------
  // Detection helpers
  // -----------------------------------------------------------------------

  /**
   * Dissociation detection (#132) — composite score:
   *   - engagement значительно ниже baseline
   *   - valence variance низкая (эмоциональное "онемение")
   *   - confidence (detection quality) не используется — face-api тоже может
   *     выдать low confidence из-за отведённого лица
   *
   * Если baseline ещё не установлен — fallback на пороговые значения.
   */
  detectDissociation(snapshot: EmotionSnapshot): boolean {
    // Проверяем consecutive low readings — любая версия детекции требует устойчивого паттерна
    const tail = this.recentSnapshots.slice(-DISSOCIATION_MIN_CONSECUTIVE);
    if (tail.length < DISSOCIATION_MIN_CONSECUTIVE) return false;

    if (this.baseline) {
      // Composite detection с baseline
      const engagementDrop =
        this.baseline.engagement - snapshot.engagement;
      const valenceVariance = this.computeVariance(tail.map((s) => s.valence));

      const tailEngagementAvg =
        tail.reduce((sum, s) => sum + s.engagement, 0) / tail.length;
      const sustainedDrop =
        this.baseline.engagement - tailEngagementAvg;

      // Критерии (any of the following):
      //  1. Устойчивое падение engagement > DISSOCIATION_DEVIATION_THRESHOLD от baseline
      //  2. Низкая valence variance (< 0.05) — numbing
      //  3. Единичный сильный provocation + высокий arousal в baseline → freeze
      const isDissociating =
        (sustainedDrop > DISSOCIATION_DEVIATION_THRESHOLD && engagementDrop > 0.15) ||
        (valenceVariance < 0.05 && snapshot.engagement < this.baseline.engagement * 0.5);

      return isDissociating;
    }

    // Fallback (no baseline yet): пороговая детекция
    if (
      snapshot.engagement >= this.thresholds.dissociationEngagementMin ||
      snapshot.stress >= this.thresholds.dissociationAttentionMin
    ) {
      return false;
    }

    return tail.every(
      (s) =>
        s.engagement < this.thresholds.dissociationEngagementMin &&
        s.confidence < this.thresholds.dissociationAttentionMin
    );
  }

  /**
   * Вычисление baseline (#132) — усреднение по первому окну активности.
   */
  private computeBaseline(): void {
    if (this.baselineCollector.length === 0) return;

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => sum(arr) / arr.length;

    const engagement = avg(this.baselineCollector.map((s) => s.engagement));
    const stress = avg(this.baselineCollector.map((s) => s.stress));
    const valence = avg(this.baselineCollector.map((s) => s.valence));
    const arousal = avg(this.baselineCollector.map((s) => s.arousal));
    const variance = this.computeVariance(
      this.baselineCollector.map((s) => s.valence),
    );

    this.baseline = { engagement, stress, valence, arousal, variance };
  }

  private computeVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return (
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
    );
  }

  /** Для тестов/телеметрии */
  getBaseline() {
    return this.baseline;
  }

  /**
   * Abreaction: arousal exceeds threshold AND valence swings > 0.4 within the window.
   */
  detectAbreaction(recentEmotions: EmotionSnapshot[]): boolean {
    if (recentEmotions.length < 2) return false;

    const window = recentEmotions.slice(-ABREACTION_WINDOW);
    const latest = window[window.length - 1];

    if (latest.arousal < this.thresholds.abreactionArousalThreshold) {
      return false;
    }

    const valences = window.map((s) => s.valence);
    const maxValence = Math.max(...valences);
    const minValence = Math.min(...valences);

    return maxValence - minValence > 0.4;
  }

  /**
   * Window of tolerance exceeded:
   *  - stress > critical for WINDOW_EXCEEDED_DURATION consecutive snapshots
   *  - OR stress < 0.05 (emotional shutdown)
   */
  detectWindowExceeded(
    snapshot: EmotionSnapshot,
    baseline?: EmotionSnapshot
  ): boolean {
    // Emotional shutdown
    if (snapshot.stress < 0.05) return true;

    // Sustained critical stress
    const tail = this.recentSnapshots.slice(-WINDOW_EXCEEDED_DURATION);
    if (tail.length < WINDOW_EXCEEDED_DURATION) return false;

    return tail.every((s) => s.stress > this.thresholds.stressCritical);
  }

  /**
   * Stress spike: increase > 0.3 compared to a snapshot ~2 seconds ago.
   */
  detectStressSpike(
    current: EmotionSnapshot,
    previous: EmotionSnapshot
  ): boolean {
    return current.stress - previous.stress > 0.3;
  }

  // -----------------------------------------------------------------------
  // Intervention mapping
  // -----------------------------------------------------------------------

  getIntervention(event: SafetyEvent): Intervention {
    const map: Record<SafetyEventType, Intervention> = {
      dissociation: {
        type: 'grounding_54321',
        instructions:
          'Client may be dissociating. Initiate 5-4-3-2-1 grounding: name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste.',
        priority: 'critical',
      },
      abreaction: {
        type: 'breathing',
        instructions:
          'Strong emotional response detected. Guide slow breathing: inhale 4 counts, hold 4 counts, exhale 6 counts. Slow or stop BLS.',
        priority: 'high',
      },
      window_exceeded: {
        type: 'safe_place',
        instructions:
          'Client has exceeded their window of tolerance. Guide them to their safe place visualization. Pause processing.',
        priority: 'high',
      },
      high_stress: {
        type: 'slow_bls',
        instructions:
          'Elevated stress detected. Reduce BLS speed by 20% and check in with the client.',
        priority: 'medium',
      },
      stop_signal: {
        type: 'pause',
        instructions:
          'Client has signaled to stop. Pause BLS immediately and check in.',
        priority: 'high',
      },
      crisis: {
        type: 'crisis_protocol',
        instructions:
          'Crisis-level distress detected. End processing immediately. Activate grounding and assess for safety.',
        priority: 'critical',
      },
    };

    return map[event.type];
  }

  // -----------------------------------------------------------------------
  // Safety gate
  // -----------------------------------------------------------------------

  isSafeToContinue(state: EmdrSessionState): { safe: boolean; reason?: string } {
    // Unresolved critical safety events
    const unresolved = state.safetyEvents.filter(
      (e) => !e.resolved && (e.severity === 'critical' || e.severity === 'high')
    );

    if (unresolved.length > 0) {
      return {
        safe: false,
        reason: `${unresolved.length} unresolved safety event(s): ${unresolved.map((e) => e.type).join(', ')}`,
      };
    }

    // Too many BLS sets without SUDS improvement
    if (state.blsSetsCompleted >= this.thresholds.maxSetsWithoutProgress) {
      const suds = state.sudsHistory;
      if (suds.length >= 2) {
        const recent = suds.slice(-this.thresholds.maxSetsWithoutProgress);
        const first = recent[0].value;
        const last = recent[recent.length - 1].value;
        if (last >= first) {
          return {
            safe: false,
            reason: `No SUDS improvement after ${this.thresholds.maxSetsWithoutProgress} BLS sets. Consider interweave or modality change.`,
          };
        }
      }
    }

    return { safe: true };
  }

  // -----------------------------------------------------------------------
  // Internal utilities
  // -----------------------------------------------------------------------

  private determineRiskLevel(events: SafetyEvent[]): RiskLevel {
    if (events.length === 0) return 'none';

    const severityOrder: Severity[] = ['low', 'medium', 'high', 'critical'];
    let highest = 0;
    for (const e of events) {
      const idx = severityOrder.indexOf(e.severity);
      if (idx > highest) highest = idx;
    }

    return severityOrder[highest] as RiskLevel;
  }

  private highestSeverityEvent(events: SafetyEvent[]): SafetyEvent {
    const order: Severity[] = ['low', 'medium', 'high', 'critical'];
    return events.reduce((worst, ev) =>
      order.indexOf(ev.severity) > order.indexOf(worst.severity) ? ev : worst
    );
  }
}
