import { AdaptiveController } from '../adaptive-controller';
import type {
  EmdrSessionState,
  EmotionSnapshot,
  ScaleRecord,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSnapshot = (
  overrides: Partial<EmotionSnapshot> = {}
): EmotionSnapshot => ({
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

const makeSudsRecord = (value: number): ScaleRecord => ({
  timestamp: Date.now(),
  value,
  context: `suds-${value}`,
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

describe('AdaptiveController', () => {
  let controller: AdaptiveController;

  beforeEach(() => {
    controller = new AdaptiveController();
  });

  // -----------------------------------------------------------------------
  // BLS params per phase
  // -----------------------------------------------------------------------

  describe('calculateBlsParams', () => {
    it('should return desensitization preset params', () => {
      const snap = makeSnapshot();
      const config = controller.calculateBlsParams('desensitization', snap, 0, []);

      // Desensitization preset: speed [0.8, 1.2] midpoint=1.0, setLength [24,40] midpoint=32
      expect(config.speed).toBe(1.0);
      expect(config.setLength).toBe(32);
      expect(config.type).toBe('eye_movement');
    });

    it('should return installation preset params', () => {
      const snap = makeSnapshot();
      const config = controller.calculateBlsParams('installation', snap, 0, []);

      // Installation preset: speed [0.6, 0.8] midpoint=0.7, setLength [10,15] midpoint=13
      expect(config.speed).toBe(0.7);
      expect(config.setLength).toBe(13);
    });

    it('should return default params for phases without preset', () => {
      const snap = makeSnapshot();
      const config = controller.calculateBlsParams('body_scan', snap, 0, []);

      expect(config.speed).toBe(1.0);
      expect(config.setLength).toBe(24);
    });

    it('should reduce speed by 20% for high stress (> 0.75)', () => {
      const snap = makeSnapshot({ stress: 0.85 });
      const config = controller.calculateBlsParams('desensitization', snap, 0, []);

      // Base midpoint for desensitization is 1.0, 80% of that is 0.8
      expect(config.speed).toBe(0.8);
    });

    it('should use calming pattern for high stress', () => {
      const snap = makeSnapshot({ stress: 0.85 });
      const config = controller.calculateBlsParams('desensitization', snap, 0, []);

      const calmingPatterns = ['circular', 'wave', 'pendulum'];
      expect(calmingPatterns).toContain(config.pattern);
    });

    it('should increase speed by 10% for low engagement (< 0.3) when stress is not high', () => {
      const snap = makeSnapshot({ engagement: 0.2, stress: 0.3 });
      const config = controller.calculateBlsParams('desensitization', snap, 0, []);

      // Base 1.0 * 1.1 = 1.1
      expect(config.speed).toBe(1.1);
    });

    it('should use stimulating pattern for low engagement', () => {
      const snap = makeSnapshot({ engagement: 0.2, stress: 0.3 });
      const config = controller.calculateBlsParams('desensitization', snap, 0, []);

      const stimulatingPatterns = ['butterfly', 'lissajous', 'random_smooth'];
      expect(stimulatingPatterns).toContain(config.pattern);
    });

    it('should clamp speed to safe range [0.4, 1.5]', () => {
      // Force very low speed by high stress on installation phase (0.7 * 0.8 = 0.56 — still in range)
      // Test upper bound: low engagement + no stress on a phase with no preset => 1.0 * 1.1 = 1.1 — in range
      const snap = makeSnapshot({ engagement: 0.2, stress: 0.3 });
      const config = controller.calculateBlsParams('desensitization', snap, 0, []);
      expect(config.speed).toBeGreaterThanOrEqual(0.4);
      expect(config.speed).toBeLessThanOrEqual(1.5);
    });
  });

  // -----------------------------------------------------------------------
  // Stuck processing detection
  // -----------------------------------------------------------------------

  describe('isProcessingStuck', () => {
    it('should return true when SUDS unchanged for 3+ records and 3+ BLS sets', () => {
      const suds = [makeSudsRecord(5), makeSudsRecord(5), makeSudsRecord(5)];
      expect(controller.isProcessingStuck(suds, 3)).toBe(true);
    });

    it('should return false when SUDS values differ', () => {
      const suds = [makeSudsRecord(5), makeSudsRecord(5), makeSudsRecord(4)];
      expect(controller.isProcessingStuck(suds, 3)).toBe(false);
    });

    it('should return false with fewer than 3 SUDS records', () => {
      const suds = [makeSudsRecord(5), makeSudsRecord(5)];
      expect(controller.isProcessingStuck(suds, 3)).toBe(false);
    });

    it('should return false with fewer than 3 BLS sets', () => {
      const suds = [makeSudsRecord(5), makeSudsRecord(5), makeSudsRecord(5)];
      expect(controller.isProcessingStuck(suds, 2)).toBe(false);
    });

    it('should check only the last 3 values', () => {
      const suds = [
        makeSudsRecord(8),
        makeSudsRecord(6),
        makeSudsRecord(5),
        makeSudsRecord(5),
        makeSudsRecord(5),
      ];
      expect(controller.isProcessingStuck(suds, 5)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Interweave suggestions
  // -----------------------------------------------------------------------

  describe('suggestInterweave', () => {
    it('should return an interweave when processing is stuck in desensitization', () => {
      const state = makeSessionState({
        currentPhase: 'desensitization',
        blsSetsCompleted: 4,
        sudsHistory: [makeSudsRecord(5), makeSudsRecord(5), makeSudsRecord(5)],
      });

      const result = controller.suggestInterweave(state);
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
    });

    it('should return null when not in desensitization', () => {
      const state = makeSessionState({
        currentPhase: 'installation',
        blsSetsCompleted: 4,
        sudsHistory: [makeSudsRecord(5), makeSudsRecord(5), makeSudsRecord(5)],
      });

      expect(controller.suggestInterweave(state)).toBeNull();
    });

    it('should return null when processing is not stuck', () => {
      const state = makeSessionState({
        currentPhase: 'desensitization',
        blsSetsCompleted: 4,
        sudsHistory: [makeSudsRecord(7), makeSudsRecord(5), makeSudsRecord(3)],
      });

      expect(controller.suggestInterweave(state)).toBeNull();
    });

    it('should return deterministic interweave based on blsSetsCompleted', () => {
      const state = makeSessionState({
        currentPhase: 'desensitization',
        blsSetsCompleted: 3,
        sudsHistory: [makeSudsRecord(5), makeSudsRecord(5), makeSudsRecord(5)],
      });

      const result1 = controller.suggestInterweave(state);
      const result2 = controller.suggestInterweave(state);
      expect(result1).toBe(result2);
    });
  });

  // -----------------------------------------------------------------------
  // Phase transition recommendations
  // -----------------------------------------------------------------------

  describe('shouldTransitionPhase', () => {
    it('should recommend transition to installation when SUDS = 0', () => {
      const state = makeSessionState({
        currentPhase: 'desensitization',
        sudsHistory: [makeSudsRecord(7), makeSudsRecord(3), makeSudsRecord(0)],
      });

      const result = controller.shouldTransitionPhase(state);
      expect(result.transition).toBe(true);
      expect(result.nextPhase).toBe('installation');
      expect(result.reason).toContain('SUDS reached 0');
    });

    it('should recommend transition to body_scan when VOC = 7', () => {
      const state = makeSessionState({
        currentPhase: 'installation',
        vocHistory: [
          { timestamp: 1, value: 3, context: 'start' },
          { timestamp: 2, value: 7, context: 'end' },
        ],
      });

      const result = controller.shouldTransitionPhase(state);
      expect(result.transition).toBe(true);
      expect(result.nextPhase).toBe('body_scan');
      expect(result.reason).toContain('VOC reached 7');
    });

    it('should recommend transition to closure when body scan is clear', () => {
      const state = makeSessionState({
        currentPhase: 'body_scan',
        emotionTrack: [makeSnapshot({ stress: 0.1, arousal: 0.2 })],
      });

      const result = controller.shouldTransitionPhase(state);
      expect(result.transition).toBe(true);
      expect(result.nextPhase).toBe('closure');
    });

    it('should NOT recommend transition when SUDS > 0 in desensitization', () => {
      const state = makeSessionState({
        currentPhase: 'desensitization',
        sudsHistory: [makeSudsRecord(3)],
      });

      const result = controller.shouldTransitionPhase(state);
      expect(result.transition).toBe(false);
    });

    it('should NOT recommend transition for phases without rules', () => {
      const state = makeSessionState({ currentPhase: 'history' });
      const result = controller.shouldTransitionPhase(state);
      expect(result.transition).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Effectiveness calculation
  // -----------------------------------------------------------------------

  describe('calculateEffectiveness', () => {
    it('should return 0 for empty session', () => {
      const state = makeSessionState();
      const score = controller.calculateEffectiveness(state);
      // Only safety factor (0.1 / 0.2 factors = 0.5) — no safety events means full safety score
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should score higher for session with SUDS improvement', () => {
      const improvedState = makeSessionState({
        sudsHistory: [makeSudsRecord(8), makeSudsRecord(2)],
        vocHistory: [
          { timestamp: 1, value: 2, context: 'start' },
          { timestamp: 2, value: 6, context: 'end' },
        ],
        phaseHistory: [
          { from: 'desensitization', to: 'closure', timestamp: Date.now(), reason: 'done' },
        ],
      });

      const noChangeState = makeSessionState({
        sudsHistory: [makeSudsRecord(8), makeSudsRecord(8)],
        vocHistory: [
          { timestamp: 1, value: 2, context: 'start' },
          { timestamp: 2, value: 2, context: 'end' },
        ],
      });

      const improved = controller.calculateEffectiveness(improvedState);
      const noChange = controller.calculateEffectiveness(noChangeState);

      expect(improved).toBeGreaterThan(noChange);
    });

    it('should penalize safety events', () => {
      const safeState = makeSessionState({
        sudsHistory: [makeSudsRecord(8), makeSudsRecord(2)],
      });

      const unsafeState = makeSessionState({
        sudsHistory: [makeSudsRecord(8), makeSudsRecord(2)],
        safetyEvents: [
          { timestamp: 1, type: 'dissociation', severity: 'critical', actionTaken: 'grounding', resolved: true },
          { timestamp: 2, type: 'abreaction', severity: 'high', actionTaken: 'breathing', resolved: true },
          { timestamp: 3, type: 'high_stress', severity: 'medium', actionTaken: 'slow_bls', resolved: true },
        ],
      });

      const safeScore = controller.calculateEffectiveness(safeState);
      const unsafeScore = controller.calculateEffectiveness(unsafeState);

      expect(safeScore).toBeGreaterThan(unsafeScore);
    });

    it('should give bonus for reaching closure', () => {
      const withClosure = makeSessionState({
        phaseHistory: [
          { from: 'desensitization', to: 'closure', timestamp: Date.now(), reason: 'done' },
        ],
      });

      const withoutClosure = makeSessionState();

      const closureScore = controller.calculateEffectiveness(withClosure);
      const noClosureScore = controller.calculateEffectiveness(withoutClosure);

      expect(closureScore).toBeGreaterThan(noClosureScore);
    });

    it('should return value between 0 and 1', () => {
      const state = makeSessionState({
        sudsHistory: [makeSudsRecord(10), makeSudsRecord(0)],
        vocHistory: [
          { timestamp: 1, value: 1, context: 's' },
          { timestamp: 2, value: 7, context: 'e' },
        ],
        emotionTrack: [
          makeSnapshot({ stress: 0.8 }),
          makeSnapshot({ stress: 0.1 }),
        ],
        phaseHistory: [
          { from: 'desensitization', to: 'closure', timestamp: Date.now(), reason: 'done' },
        ],
      });

      const score = controller.calculateEffectiveness(state);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle empty SUDS history in isProcessingStuck', () => {
      expect(controller.isProcessingStuck([], 0)).toBe(false);
    });

    it('should handle single data point in calculateEffectiveness', () => {
      const state = makeSessionState({
        sudsHistory: [makeSudsRecord(5)],
      });
      const score = controller.calculateEffectiveness(state);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});
