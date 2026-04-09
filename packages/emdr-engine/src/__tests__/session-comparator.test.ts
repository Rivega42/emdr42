import { SessionComparator } from '../session-comparator';
import type {
  EmotionSnapshot,
  FullSessionExport,
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

const makeSession = (
  overrides: Partial<FullSessionExport> = {}
): FullSessionExport => ({
  sessionId: 's1',
  userId: 'u1',
  startedAt: Date.now() - 3600000,
  endedAt: Date.now(),
  elapsedSeconds: 3600,
  phases: [],
  target: null,
  sudsHistory: [],
  vocHistory: [],
  emotionTrack: [],
  timeline: [],
  safetyEvents: [],
  blsSetsCompleted: 5,
  closureTechnique: 'safe place',
  clientStateAtEnd: 'calm',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionComparator', () => {
  let comparator: SessionComparator;

  beforeEach(() => {
    comparator = new SessionComparator();
  });

  // -----------------------------------------------------------------------
  // Session comparison
  // -----------------------------------------------------------------------

  describe('compare', () => {
    it('should calculate correct SUDS delta', () => {
      const previous = makeSession({
        sessionId: 'prev',
        sudsHistory: [{ timestamp: 1, value: 8, context: 'start' }],
      });
      const current = makeSession({
        sessionId: 'curr',
        sudsHistory: [{ timestamp: 1, value: 3, context: 'end' }],
      });

      const result = comparator.compare(current, previous);
      expect(result.sudsDelta).toBe(-5); // 3 - 8
      expect(result.currentSessionId).toBe('curr');
      expect(result.previousSessionId).toBe('prev');
    });

    it('should calculate correct VOC delta', () => {
      const previous = makeSession({
        vocHistory: [{ timestamp: 1, value: 2, context: 's' }],
      });
      const current = makeSession({
        vocHistory: [{ timestamp: 1, value: 6, context: 'e' }],
      });

      const result = comparator.compare(current, previous);
      expect(result.vocDelta).toBe(4); // 6 - 2
    });

    it('should calculate stress delta from emotion tracks', () => {
      const previous = makeSession({
        emotionTrack: [
          makeSnapshot({ stress: 0.6 }),
          makeSnapshot({ stress: 0.4 }),
        ],
      });
      const current = makeSession({
        emotionTrack: [
          makeSnapshot({ stress: 0.3 }),
          makeSnapshot({ stress: 0.1 }),
        ],
      });

      const result = comparator.compare(current, previous);
      // Current avg stress: 0.2, Previous avg stress: 0.5
      expect(result.avgStressDelta).toBeLessThan(0);
    });

    it('should list improvements when SUDS decreases', () => {
      const previous = makeSession({
        sudsHistory: [{ timestamp: 1, value: 8, context: 's' }],
      });
      const current = makeSession({
        sudsHistory: [{ timestamp: 1, value: 3, context: 'e' }],
      });

      const result = comparator.compare(current, previous);
      expect(result.improvements.some((i) => i.includes('SUDS decreased'))).toBe(true);
    });

    it('should list concerns when SUDS increases', () => {
      const previous = makeSession({
        sudsHistory: [{ timestamp: 1, value: 3, context: 's' }],
      });
      const current = makeSession({
        sudsHistory: [{ timestamp: 1, value: 7, context: 'e' }],
      });

      const result = comparator.compare(current, previous);
      expect(result.concerns.some((c) => c.includes('SUDS increased'))).toBe(true);
    });

    it('should list improvements when VOC improves', () => {
      const previous = makeSession({
        vocHistory: [{ timestamp: 1, value: 2, context: 's' }],
      });
      const current = makeSession({
        vocHistory: [{ timestamp: 1, value: 5, context: 'e' }],
      });

      const result = comparator.compare(current, previous);
      expect(result.improvements.some((i) => i.includes('VOC improved'))).toBe(true);
    });

    it('should note fewer safety events as improvement', () => {
      const previous = makeSession({
        safetyEvents: [
          { timestamp: 1, type: 'high_stress', severity: 'medium', actionTaken: 'slow_bls', resolved: true },
          { timestamp: 2, type: 'abreaction', severity: 'high', actionTaken: 'breathing', resolved: true },
        ],
      });
      const current = makeSession({ safetyEvents: [] });

      const result = comparator.compare(current, previous);
      expect(result.improvements.some((i) => i.includes('Fewer safety events'))).toBe(true);
    });

    it('should note more safety events as concern', () => {
      const previous = makeSession({ safetyEvents: [] });
      const current = makeSession({
        safetyEvents: [
          { timestamp: 1, type: 'high_stress', severity: 'medium', actionTaken: 'slow_bls', resolved: true },
        ],
      });

      const result = comparator.compare(current, previous);
      expect(result.concerns.some((c) => c.includes('More safety events'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Effectiveness score
  // -----------------------------------------------------------------------

  describe('calculateEffectivenessScore', () => {
    it('should return 0.5 for neutral comparison', () => {
      const score = comparator.calculateEffectivenessScore({
        currentSessionId: 'c',
        previousSessionId: 'p',
        sudsDelta: 0,
        vocDelta: 0,
        avgStressDelta: 0,
        avgEngagementDelta: 0,
        effectivenessScore: 0,
        improvements: [],
        concerns: [],
      });

      expect(score).toBe(0.5);
    });

    it('should score higher when SUDS decreases', () => {
      const improved = comparator.calculateEffectivenessScore({
        currentSessionId: 'c',
        previousSessionId: 'p',
        sudsDelta: -5,
        vocDelta: 0,
        avgStressDelta: 0,
        avgEngagementDelta: 0,
        effectivenessScore: 0,
        improvements: [],
        concerns: [],
      });

      expect(improved).toBeGreaterThan(0.5);
    });

    it('should score lower when SUDS increases', () => {
      const worsened = comparator.calculateEffectivenessScore({
        currentSessionId: 'c',
        previousSessionId: 'p',
        sudsDelta: 5,
        vocDelta: 0,
        avgStressDelta: 0,
        avgEngagementDelta: 0,
        effectivenessScore: 0,
        improvements: [],
        concerns: [],
      });

      expect(worsened).toBeLessThan(0.5);
    });

    it('should be clamped between 0 and 1', () => {
      const extreme = comparator.calculateEffectivenessScore({
        currentSessionId: 'c',
        previousSessionId: 'p',
        sudsDelta: -10,
        vocDelta: 6,
        avgStressDelta: -0.5,
        avgEngagementDelta: 0.5,
        effectivenessScore: 0,
        improvements: [],
        concerns: [],
      });

      expect(extreme).toBeGreaterThanOrEqual(0);
      expect(extreme).toBeLessThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // Progress summary
  // -----------------------------------------------------------------------

  describe('generateProgressSummary', () => {
    it('should handle empty sessions array', () => {
      const summary = comparator.generateProgressSummary([]);
      expect(summary.totalSessions).toBe(0);
      expect(summary.summary).toBe('No sessions to summarize.');
    });

    it('should calculate averages across multiple sessions', () => {
      const sessions = [
        makeSession({
          sessionId: 's1',
          sudsHistory: [
            { timestamp: 1, value: 8, context: 's' },
            { timestamp: 2, value: 4, context: 'e' },
          ],
          vocHistory: [
            { timestamp: 1, value: 2, context: 's' },
            { timestamp: 2, value: 5, context: 'e' },
          ],
        }),
        makeSession({
          sessionId: 's2',
          sudsHistory: [
            { timestamp: 1, value: 6, context: 's' },
            { timestamp: 2, value: 2, context: 'e' },
          ],
          vocHistory: [
            { timestamp: 1, value: 3, context: 's' },
            { timestamp: 2, value: 6, context: 'e' },
          ],
        }),
      ];

      const summary = comparator.generateProgressSummary(sessions);
      expect(summary.totalSessions).toBe(2);
      // SUDS drops: (8-4)=4, (6-2)=4 => avg=4
      expect(summary.avgSudsDrop).toBe(4);
      // VOC gains: (5-2)=3, (6-3)=3 => avg=3
      expect(summary.avgVocGain).toBe(3);
      expect(summary.completionRate).toBe(1); // both have closureTechnique
    });

    it('should count sessions with safety events', () => {
      const sessions = [
        makeSession({ sessionId: 's1' }),
        makeSession({
          sessionId: 's2',
          safetyEvents: [
            { timestamp: 1, type: 'high_stress', severity: 'medium', actionTaken: 'slow_bls', resolved: true },
          ],
        }),
      ];

      const summary = comparator.generateProgressSummary(sessions);
      expect(summary.sessionsWithSafetyEvents).toBe(1);
    });

    it('should include summary text', () => {
      const sessions = [
        makeSession({
          sudsHistory: [
            { timestamp: 1, value: 8, context: 's' },
            { timestamp: 2, value: 3, context: 'e' },
          ],
        }),
      ];

      const summary = comparator.generateProgressSummary(sessions);
      expect(summary.summary).toContain('1 session(s)');
      expect(summary.summary).toContain('SUDS reduction');
    });

    it('should handle sessions without SUDS/VOC data', () => {
      const sessions = [makeSession({ closureTechnique: '' })];
      const summary = comparator.generateProgressSummary(sessions);
      expect(summary.avgSudsDrop).toBe(0);
      expect(summary.avgVocGain).toBe(0);
      expect(summary.completionRate).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Trend analysis
  // -----------------------------------------------------------------------

  describe('identifyTrends', () => {
    it('should identify improving trend when end SUDS decreases across sessions', () => {
      const sessions = [
        makeSession({
          sessionId: 's1',
          sudsHistory: [
            { timestamp: 1, value: 8, context: 's' },
            { timestamp: 2, value: 6, context: 'e' },
          ],
        }),
        makeSession({
          sessionId: 's2',
          sudsHistory: [
            { timestamp: 1, value: 6, context: 's' },
            { timestamp: 2, value: 3, context: 'e' },
          ],
        }),
      ];

      const trends = comparator.identifyTrends(sessions);
      expect(trends.direction).toBe('improving');
      expect(trends.confidence).toBeGreaterThan(0);
    });

    it('should identify declining trend when end SUDS increases', () => {
      const sessions = [
        makeSession({
          sessionId: 's1',
          sudsHistory: [
            { timestamp: 1, value: 3, context: 's' },
            { timestamp: 2, value: 2, context: 'e' },
          ],
        }),
        makeSession({
          sessionId: 's2',
          sudsHistory: [
            { timestamp: 1, value: 5, context: 's' },
            { timestamp: 2, value: 5, context: 'e' },
          ],
        }),
      ];

      const trends = comparator.identifyTrends(sessions);
      expect(trends.direction).toBe('declining');
    });

    it('should identify stable trend when end SUDS is similar', () => {
      const sessions = [
        makeSession({
          sessionId: 's1',
          sudsHistory: [
            { timestamp: 1, value: 5, context: 's' },
            { timestamp: 2, value: 4, context: 'e' },
          ],
        }),
        makeSession({
          sessionId: 's2',
          sudsHistory: [
            { timestamp: 1, value: 5, context: 's' },
            { timestamp: 2, value: 4, context: 'e' },
          ],
        }),
      ];

      const trends = comparator.identifyTrends(sessions);
      expect(trends.direction).toBe('stable');
    });

    it('should return sudsOverTime, vocOverTime, and stressOverTime arrays', () => {
      const sessions = [
        makeSession({
          sessionId: 's1',
          sudsHistory: [{ timestamp: 1, value: 8, context: 's' }],
          vocHistory: [{ timestamp: 1, value: 2, context: 's' }],
          emotionTrack: [makeSnapshot({ stress: 0.5 })],
        }),
      ];

      const trends = comparator.identifyTrends(sessions);
      expect(trends.sudsOverTime).toHaveLength(1);
      expect(trends.vocOverTime).toHaveLength(1);
      expect(trends.stressOverTime).toHaveLength(1);
      expect(trends.sudsOverTime[0].sessionId).toBe('s1');
    });

    it('should handle sessions with no emotion data', () => {
      const sessions = [
        makeSession({ sessionId: 's1', emotionTrack: [] }),
        makeSession({ sessionId: 's2', emotionTrack: [] }),
      ];

      const trends = comparator.identifyTrends(sessions);
      expect(trends.stressOverTime.every((s) => s.avgStress === 0)).toBe(true);
    });

    it('should return stable with high confidence for identical sessions', () => {
      const sessions = [
        makeSession({
          sessionId: 's1',
          sudsHistory: [{ timestamp: 1, value: 5, context: 's' }],
        }),
        makeSession({
          sessionId: 's2',
          sudsHistory: [{ timestamp: 1, value: 5, context: 's' }],
        }),
      ];

      const trends = comparator.identifyTrends(sessions);
      expect(trends.direction).toBe('stable');
      expect(trends.confidence).toBe(1);
    });
  });
});
