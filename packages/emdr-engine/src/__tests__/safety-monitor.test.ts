import { SafetyMonitor } from '../safety-monitor';
import type {
  EmdrSessionState,
  EmotionSnapshot,
  SafetyEvent,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSnapshot = (overrides: Partial<EmotionSnapshot> = {}): EmotionSnapshot => ({
  timestamp: Date.now(),
  stress: 0.3,
  engagement: 0.6,
  positivity: 0.5,
  arousal: 0.4,
  valence: 0.5,
  joy: 0.3,
  sadness: 0.1,
  anger: 0.05,
  fear: 0.1,
  confidence: 0.8,
  ...overrides,
});

const makeSessionState = (
  overrides: Partial<EmdrSessionState> = {}
): EmdrSessionState => ({
  sessionId: 's1',
  userId: 'u1',
  currentPhase: 'desensitization',
  phaseHistory: [],
  target: null,
  sudsHistory: [],
  vocHistory: [],
  emotionTrack: [],
  timelineEvents: [],
  safetyEvents: [],
  blsConfig: { pattern: 'horizontal', speed: 1.0, setLength: 24, type: 'eye_movement' },
  blsSetsCompleted: 0,
  isActive: true,
  isPaused: false,
  startedAt: Date.now(),
  elapsedSeconds: 0,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SafetyMonitor', () => {
  let monitor: SafetyMonitor;

  beforeEach(() => {
    monitor = new SafetyMonitor();
  });

  // -----------------------------------------------------------------------
  // Normal emotions — safe
  // -----------------------------------------------------------------------

  describe('normal emotions', () => {
    it('should return safe for normal emotion data', () => {
      const state = makeSessionState();
      const snap = makeSnapshot();
      const result = monitor.analyzeEmotion(snap, state);

      expect(result.safe).toBe(true);
      expect(result.riskLevel).toBe('none');
      expect(result.events).toHaveLength(0);
      expect(result.intervention).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Dissociation detection
  // -----------------------------------------------------------------------

  describe('dissociation detection', () => {
    it('should detect dissociation after 3 consecutive low engagement/confidence snapshots', () => {
      const state = makeSessionState();
      const lowSnap = makeSnapshot({
        engagement: 0.05,
        confidence: 0.05,
        stress: 0.05,
      });

      // Feed 3 consecutive low snapshots (need 3 for dissociation)
      monitor.analyzeEmotion(lowSnap, state);
      monitor.analyzeEmotion(lowSnap, state);
      const result = monitor.analyzeEmotion(lowSnap, state);

      expect(result.safe).toBe(false);
      expect(result.events.some((e) => e.type === 'dissociation')).toBe(true);
    });

    it('should NOT detect dissociation from a single low snapshot', () => {
      const state = makeSessionState();
      const lowSnap = makeSnapshot({
        engagement: 0.05,
        confidence: 0.05,
        stress: 0.05,
      });

      const result = monitor.analyzeEmotion(lowSnap, state);
      // Only 1 snapshot — not enough for sustained dissociation
      expect(result.events.some((e) => e.type === 'dissociation')).toBe(false);
    });

    it('should NOT detect dissociation if engagement is above threshold', () => {
      const state = makeSessionState();
      // Engagement above 0.1 threshold
      const snap = makeSnapshot({
        engagement: 0.2,
        confidence: 0.05,
        stress: 0.05,
      });

      monitor.analyzeEmotion(snap, state);
      monitor.analyzeEmotion(snap, state);
      const result = monitor.analyzeEmotion(snap, state);
      expect(result.events.some((e) => e.type === 'dissociation')).toBe(false);
    });

    it('should break dissociation streak when a normal snapshot appears', () => {
      const state = makeSessionState();
      const lowSnap = makeSnapshot({
        engagement: 0.05,
        confidence: 0.05,
        stress: 0.05,
      });
      const normalSnap = makeSnapshot();

      monitor.analyzeEmotion(lowSnap, state);
      monitor.analyzeEmotion(lowSnap, state);
      // Normal in between — resets streak
      monitor.analyzeEmotion(normalSnap, state);
      const result = monitor.analyzeEmotion(lowSnap, state);
      expect(result.events.some((e) => e.type === 'dissociation')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Abreaction detection
  // -----------------------------------------------------------------------

  describe('abreaction detection', () => {
    it('should detect abreaction when arousal > 0.85 and valence swing > 0.4', () => {
      const state = makeSessionState();
      // Build a window with valence swing
      monitor.analyzeEmotion(makeSnapshot({ arousal: 0.5, valence: 0.2 }), state);
      monitor.analyzeEmotion(makeSnapshot({ arousal: 0.6, valence: 0.3 }), state);
      // Latest has high arousal AND the window has >0.4 valence range
      const result = monitor.analyzeEmotion(
        makeSnapshot({ arousal: 0.9, valence: 0.7 }),
        state
      );

      expect(result.events.some((e) => e.type === 'abreaction')).toBe(true);
    });

    it('should NOT detect abreaction when arousal is below threshold', () => {
      const state = makeSessionState();
      monitor.analyzeEmotion(makeSnapshot({ arousal: 0.4, valence: 0.2 }), state);
      const result = monitor.analyzeEmotion(
        makeSnapshot({ arousal: 0.7, valence: 0.8 }),
        state
      );

      expect(result.events.some((e) => e.type === 'abreaction')).toBe(false);
    });

    it('should NOT detect abreaction when valence swing is small', () => {
      const state = makeSessionState();
      monitor.analyzeEmotion(makeSnapshot({ arousal: 0.9, valence: 0.5 }), state);
      const result = monitor.analyzeEmotion(
        makeSnapshot({ arousal: 0.9, valence: 0.6 }),
        state
      );

      expect(result.events.some((e) => e.type === 'abreaction')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Window of tolerance exceeded
  // -----------------------------------------------------------------------

  describe('window of tolerance', () => {
    it('should detect window exceeded when stress > 0.9 for 10+ snapshots', () => {
      const state = makeSessionState();
      const highStressSnap = makeSnapshot({ stress: 0.95 });

      let result;
      for (let i = 0; i < 10; i++) {
        result = monitor.analyzeEmotion(highStressSnap, state);
      }

      expect(result!.events.some((e) => e.type === 'window_exceeded')).toBe(true);
    });

    it('should NOT detect window exceeded with fewer than 10 high-stress snapshots', () => {
      const state = makeSessionState();
      const highStressSnap = makeSnapshot({ stress: 0.95 });

      let result;
      for (let i = 0; i < 9; i++) {
        result = monitor.analyzeEmotion(highStressSnap, state);
      }

      expect(result!.events.some((e) => e.type === 'window_exceeded')).toBe(false);
    });

    it('should detect emotional shutdown (stress < 0.05)', () => {
      const state = makeSessionState();
      const shutdownSnap = makeSnapshot({ stress: 0.02, engagement: 0.5 });

      const result = monitor.analyzeEmotion(shutdownSnap, state);
      expect(result.events.some((e) => e.type === 'window_exceeded')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Stress spike detection
  // -----------------------------------------------------------------------

  describe('stress spike detection', () => {
    it('should detect a stress spike (> 0.3 increase in ~2 snapshots)', () => {
      const state = makeSessionState();
      // Need at least 3 snapshots so index -3 exists
      monitor.analyzeEmotion(makeSnapshot({ stress: 0.3 }), state);
      monitor.analyzeEmotion(makeSnapshot({ stress: 0.35 }), state);
      const result = monitor.analyzeEmotion(
        makeSnapshot({ stress: 0.7 }),
        state
      );

      expect(result.events.some((e) => e.type === 'high_stress')).toBe(true);
    });

    it('should NOT detect stress spike for gradual increase', () => {
      const state = makeSessionState();
      monitor.analyzeEmotion(makeSnapshot({ stress: 0.3 }), state);
      monitor.analyzeEmotion(makeSnapshot({ stress: 0.4 }), state);
      const result = monitor.analyzeEmotion(
        makeSnapshot({ stress: 0.5 }),
        state
      );

      expect(result.events.some((e) => e.type === 'high_stress')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Intervention mapping
  // -----------------------------------------------------------------------

  describe('intervention mapping', () => {
    const eventTypes: Array<{
      type: SafetyEvent['type'];
      expectedIntervention: string;
    }> = [
      { type: 'dissociation', expectedIntervention: 'grounding_54321' },
      { type: 'abreaction', expectedIntervention: 'breathing' },
      { type: 'window_exceeded', expectedIntervention: 'safe_place' },
      { type: 'high_stress', expectedIntervention: 'slow_bls' },
      { type: 'stop_signal', expectedIntervention: 'pause' },
      { type: 'crisis', expectedIntervention: 'crisis_protocol' },
    ];

    it.each(eventTypes)(
      'should map $type to $expectedIntervention',
      ({ type, expectedIntervention }) => {
        const event: SafetyEvent = {
          timestamp: Date.now(),
          type,
          severity: 'medium',
          actionTaken: '',
          resolved: false,
        };
        const intervention = monitor.getIntervention(event);
        expect(intervention.type).toBe(expectedIntervention);
      }
    );
  });

  // -----------------------------------------------------------------------
  // isSafeToContinue
  // -----------------------------------------------------------------------

  describe('isSafeToContinue', () => {
    it('should return safe for clean session state', () => {
      const state = makeSessionState();
      const result = monitor.isSafeToContinue(state);
      expect(result.safe).toBe(true);
    });

    it('should return unsafe when unresolved critical safety events exist', () => {
      const state = makeSessionState({
        safetyEvents: [
          {
            timestamp: Date.now(),
            type: 'dissociation',
            severity: 'critical',
            actionTaken: 'grounding_54321',
            resolved: false,
          },
        ],
      });

      const result = monitor.isSafeToContinue(state);
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('unresolved safety event');
    });

    it('should return safe when safety events are resolved', () => {
      const state = makeSessionState({
        safetyEvents: [
          {
            timestamp: Date.now(),
            type: 'dissociation',
            severity: 'critical',
            actionTaken: 'grounding_54321',
            resolved: true,
          },
        ],
      });

      const result = monitor.isSafeToContinue(state);
      expect(result.safe).toBe(true);
    });

    it('should return unsafe when SUDS not improving after max sets', () => {
      const state = makeSessionState({
        blsSetsCompleted: 5,
        sudsHistory: [
          { timestamp: 1, value: 7, context: 'set 1' },
          { timestamp: 2, value: 7, context: 'set 2' },
          { timestamp: 3, value: 7, context: 'set 3' },
          { timestamp: 4, value: 7, context: 'set 4' },
          { timestamp: 5, value: 7, context: 'set 5' },
        ],
      });

      const result = monitor.isSafeToContinue(state);
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('No SUDS improvement');
    });
  });

  // -----------------------------------------------------------------------
  // Custom thresholds
  // -----------------------------------------------------------------------

  describe('threshold customization', () => {
    it('should accept custom thresholds', () => {
      const custom = new SafetyMonitor({
        stressCritical: 0.95,
        dissociationEngagementMin: 0.2,
      });

      const state = makeSessionState();
      // With default (0.1) this would not be dissociation, but with 0.2 it should
      const lowSnap = makeSnapshot({
        engagement: 0.15,
        confidence: 0.05,
        stress: 0.05,
      });

      custom.analyzeEmotion(lowSnap, state);
      custom.analyzeEmotion(lowSnap, state);
      const result = custom.analyzeEmotion(lowSnap, state);

      expect(result.events.some((e) => e.type === 'dissociation')).toBe(true);
    });
  });
});
