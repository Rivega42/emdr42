/**
 * Adaptive Controller
 *
 * Dynamically adjusts BLS parameters, suggests phase transitions, detects
 * stuck processing, and recommends cognitive interweaves based on real-time
 * session data.
 */

import type {
  BlsConfig,
  EmdrPhase,
  EmdrSessionState,
  EmotionSnapshot,
  ScaleRecord,
} from './types';

// ---------------------------------------------------------------------------
// Phase-specific BLS presets
// ---------------------------------------------------------------------------

interface PhaseBlsPreset {
  speedRange: [number, number]; // Hz
  setLengthRange: [number, number]; // passes
  preferredPatterns: string[];
}

const PHASE_PRESETS: Partial<Record<EmdrPhase, PhaseBlsPreset>> = {
  // #131 RDI — короткие сеты, медленно, calming patterns для установки resource
  resource_development: {
    speedRange: [0.5, 0.7],
    setLengthRange: [8, 14],
    preferredPatterns: ['horizontal', 'wave', 'circular'],
  },
  desensitization: {
    speedRange: [0.8, 1.2],
    setLengthRange: [20, 40], // #131 нижняя граница снижена для адаптации
    preferredPatterns: ['horizontal', 'diagonal', 'infinity'],
  },
  installation: {
    speedRange: [0.6, 0.8],
    setLengthRange: [10, 15],
    preferredPatterns: ['horizontal', 'wave'],
  },
};

/**
 * #131 adaptive set length — предотвращает habituation (привыкание к фиксированной длине).
 * Возвращает длину сета в диапазоне preset.setLengthRange, adjusted по SUDS:
 *   - высокий SUDS (7+) → длинные сеты ближе к max
 *   - низкий SUDS (3-) → короткие сеты ближе к min
 *   - добавляется jitter ±15% (предотвращение паттернов)
 */
const adaptiveSetLength = (
  preset: PhaseBlsPreset,
  latestSuds: number | null,
): number => {
  const [min, max] = preset.setLengthRange;
  const range = max - min;

  // Нормализуем SUDS (0-10) в фактор 0-1. Если SUDS нет — центр.
  const sudsFactor = latestSuds != null ? Math.min(latestSuds, 10) / 10 : 0.5;

  // Base: чем выше SUDS, тем длиннее сет
  const base = min + range * sudsFactor;

  // Jitter ±15% в пределах range
  const jitter = (Math.random() - 0.5) * range * 0.3;
  const result = Math.round(base + jitter);

  return Math.max(min, Math.min(max, result));
};

const CALMING_PATTERNS = ['circular', 'wave', 'pendulum'];
const STIMULATING_PATTERNS = ['butterfly', 'lissajous', 'random_smooth'];

// ---------------------------------------------------------------------------
// AdaptiveController
// ---------------------------------------------------------------------------

export class AdaptiveController {
  /**
   * Calculate BLS parameters based on phase, emotion state, and progress.
   */
  calculateBlsParams(
    currentPhase: EmdrPhase,
    emotionSnapshot: EmotionSnapshot,
    blsSetsCompleted: number,
    sudsHistory: ScaleRecord[]
  ): BlsConfig {
    const preset = PHASE_PRESETS[currentPhase];
    const latestSuds =
      sudsHistory.length > 0 ? sudsHistory[sudsHistory.length - 1].value : null;

    // Base values — fall back to desensitization defaults
    let speed = preset ? (preset.speedRange[0] + preset.speedRange[1]) / 2 : 1.0;
    // #131 adaptive set length вместо захардкоженной середины диапазона
    let setLength = preset ? adaptiveSetLength(preset, latestSuds) : 24;
    let pattern = preset ? preset.preferredPatterns[0] : 'horizontal';

    // --- High stress: reduce speed 20%, use calming pattern ---
    if (emotionSnapshot.stress > 0.75) {
      speed *= 0.8;
      pattern =
        CALMING_PATTERNS[Math.floor(Math.random() * CALMING_PATTERNS.length)];
    }

    // --- Low engagement: increase speed 10%, stimulating pattern ---
    if (emotionSnapshot.engagement < 0.3 && emotionSnapshot.stress <= 0.75) {
      speed *= 1.1;
      pattern =
        STIMULATING_PATTERNS[
          Math.floor(Math.random() * STIMULATING_PATTERNS.length)
        ];
    }

    // Clamp speed to safe range
    speed = Math.max(0.4, Math.min(1.5, speed));

    // Clamp set length
    if (preset) {
      setLength = Math.max(
        preset.setLengthRange[0],
        Math.min(preset.setLengthRange[1], setLength)
      );
    }

    return {
      pattern,
      speed: Math.round(speed * 100) / 100,
      setLength,
      type: 'eye_movement',
    };
  }

  /**
   * Detect stuck processing: SUDS unchanged for 3+ consecutive BLS sets.
   */
  isProcessingStuck(
    sudsHistory: ScaleRecord[],
    blsSetsCompleted: number
  ): boolean {
    if (sudsHistory.length < 3 || blsSetsCompleted < 3) return false;

    const lastThree = sudsHistory.slice(-3);
    const values = lastThree.map((r) => r.value);

    // All three readings identical
    return values.every((v) => v === values[0]);
  }

  /**
   * Suggest a cognitive interweave when processing is stuck.
   * Returns null if no interweave is needed.
   */
  suggestInterweave(state: EmdrSessionState): string | null {
    if (state.currentPhase !== 'desensitization') return null;

    if (!this.isProcessingStuck(state.sudsHistory, state.blsSetsCompleted)) {
      return null;
    }

    const interweaves = [
      'What would you tell a friend in this situation?',
      'What have you learned from this experience?',
      'Is there another way to look at this?',
      'What does the adult you know now that the child you didn\'t?',
      'If you could tell your younger self something, what would it be?',
      'What do you need right now?',
    ];

    // Pick deterministically based on sets completed so repeated calls are stable
    return interweaves[state.blsSetsCompleted % interweaves.length];
  }

  /**
   * Determine whether the session should transition to the next phase.
   */
  shouldTransitionPhase(
    state: EmdrSessionState
  ): { transition: boolean; nextPhase?: EmdrPhase; reason?: string } {
    const { currentPhase, sudsHistory, vocHistory, blsSetsCompleted } = state;

    // --- Desensitization → Installation when SUDS reaches 0 ---
    if (currentPhase === 'desensitization' && sudsHistory.length > 0) {
      const latestSuds = sudsHistory[sudsHistory.length - 1].value;
      if (latestSuds === 0) {
        return {
          transition: true,
          nextPhase: 'installation',
          reason: 'SUDS reached 0 — target fully desensitized',
        };
      }
    }

    // --- Installation → Body Scan when VOC reaches 7 ---
    if (currentPhase === 'installation' && vocHistory.length > 0) {
      const latestVoc = vocHistory[vocHistory.length - 1].value;
      if (latestVoc === 7) {
        return {
          transition: true,
          nextPhase: 'body_scan',
          reason: 'VOC reached 7 — positive cognition fully installed',
        };
      }
    }

    // --- Body Scan → Closure when body is clear (no disturbance) ---
    // We approximate "body clear" as latest emotion snapshot showing low stress
    if (currentPhase === 'body_scan' && state.emotionTrack.length > 0) {
      const latest = state.emotionTrack[state.emotionTrack.length - 1];
      if (latest.stress < 0.15 && latest.arousal < 0.3) {
        return {
          transition: true,
          nextPhase: 'closure',
          reason: 'Body scan clear — no residual disturbance detected',
        };
      }
    }

    return { transition: false };
  }

  /**
   * Calculate overall session effectiveness score (0-1).
   */
  calculateEffectiveness(state: EmdrSessionState): number {
    let score = 0;
    let factors = 0;

    // SUDS improvement (weight 0.35)
    if (state.sudsHistory.length >= 2) {
      const first = state.sudsHistory[0].value;
      const last = state.sudsHistory[state.sudsHistory.length - 1].value;
      if (first > 0) {
        const sudsImprovement = (first - last) / first;
        score += Math.max(0, Math.min(1, sudsImprovement)) * 0.35;
      }
      factors += 0.35;
    }

    // VOC improvement (weight 0.25)
    if (state.vocHistory.length >= 2) {
      const first = state.vocHistory[0].value;
      const last = state.vocHistory[state.vocHistory.length - 1].value;
      const vocRange = 7 - 1; // VOC range 1-7
      const vocImprovement = (last - first) / vocRange;
      score += Math.max(0, Math.min(1, vocImprovement)) * 0.25;
      factors += 0.25;
    }

    // Stress reduction (weight 0.2)
    if (state.emotionTrack.length >= 2) {
      const firstQuarter = state.emotionTrack.slice(
        0,
        Math.max(1, Math.floor(state.emotionTrack.length / 4))
      );
      const lastQuarter = state.emotionTrack.slice(
        -Math.max(1, Math.floor(state.emotionTrack.length / 4))
      );

      const avgStressStart =
        firstQuarter.reduce((s, e) => s + e.stress, 0) / firstQuarter.length;
      const avgStressEnd =
        lastQuarter.reduce((s, e) => s + e.stress, 0) / lastQuarter.length;

      if (avgStressStart > 0) {
        const stressReduction = (avgStressStart - avgStressEnd) / avgStressStart;
        score += Math.max(0, Math.min(1, stressReduction)) * 0.2;
      }
      factors += 0.2;
    }

    // Session completion — did we reach closure? (weight 0.1)
    const reachedClosure = state.phaseHistory.some(
      (t) => t.to === 'closure' || t.to === 'reevaluation'
    );
    if (reachedClosure) {
      score += 0.1;
    }
    factors += 0.1;

    // Safety — fewer events is better (weight 0.1)
    const safetyPenalty = Math.min(1, state.safetyEvents.length / 5);
    score += (1 - safetyPenalty) * 0.1;
    factors += 0.1;

    return factors > 0 ? Math.round((score / factors) * 100) / 100 : 0;
  }
}
