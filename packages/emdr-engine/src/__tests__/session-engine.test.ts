import { EmdrSessionEngine } from '../session-engine';
import type {
  EmotionSnapshot,
  FullSessionExport,
  PhaseTransition,
  SafetyEvent,
  ScaleRecord,
  TargetMemory,
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

const makeTarget = (): TargetMemory => ({
  description: 'Car accident',
  image: 'Headlights approaching',
  negativeCognition: 'I am not safe',
  ncDomain: 'safety',
  positiveCognition: 'I am safe now',
  initialEmotions: ['fear', 'helplessness'],
  bodyLocation: 'chest',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmdrSessionEngine', () => {
  let engine: EmdrSessionEngine;

  beforeEach(() => {
    jest.useFakeTimers();
    engine = new EmdrSessionEngine('session-1', 'user-1');
  });

  afterEach(() => {
    // Clean up any running intervals
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  describe('session lifecycle', () => {
    it('should initialise with correct defaults', () => {
      const state = engine.getState();
      expect(state.sessionId).toBe('session-1');
      expect(state.userId).toBe('user-1');
      expect(state.currentPhase).toBe('history');
      expect(state.isActive).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.blsSetsCompleted).toBe(0);
      expect(state.elapsedSeconds).toBe(0);
    });

    it('should start a session', () => {
      engine.startSession();
      const state = engine.getState();
      expect(state.isActive).toBe(true);
      expect(state.startedAt).toBeGreaterThan(0);
    });

    it('should not start twice', () => {
      engine.startSession();
      const startedAt = engine.getState().startedAt;
      engine.startSession();
      expect(engine.getState().startedAt).toBe(startedAt);
    });

    it('should pause and resume a session', () => {
      engine.startSession();

      engine.pauseSession();
      expect(engine.getState().isPaused).toBe(true);

      engine.resumeSession();
      expect(engine.getState().isPaused).toBe(false);
    });

    it('should not pause an inactive session', () => {
      engine.pauseSession();
      expect(engine.getState().isPaused).toBe(false);
    });

    it('should not resume a session that is not paused', () => {
      engine.startSession();
      engine.resumeSession(); // not paused
      expect(engine.getState().isPaused).toBe(false);
    });

    it('should end a session', () => {
      engine.startSession();
      engine.endSession('safe place', 'calm');
      const state = engine.getState();
      expect(state.isActive).toBe(false);
      expect(state.isPaused).toBe(false);
    });

    it('should not end an inactive session', () => {
      const listener = jest.fn();
      engine.on('sessionEnded', listener);
      engine.endSession('safe place', 'calm');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Phase transitions
  // -----------------------------------------------------------------------

  describe('phase transitions', () => {
    it('should transition through valid phases', () => {
      engine.startSession();
      engine.transitionToPhase('preparation', 'ready');
      expect(engine.getCurrentPhase()).toBe('preparation');

      engine.transitionToPhase('assessment', 'targets identified');
      expect(engine.getCurrentPhase()).toBe('assessment');
    });

    it('should throw on invalid transition', () => {
      engine.startSession();
      expect(() => {
        engine.transitionToPhase('desensitization', 'skip');
      }).toThrow('Invalid transition from "history" to "desensitization"');
    });

    it('should record phase history', () => {
      engine.startSession();
      engine.transitionToPhase('preparation', 'ready');
      engine.transitionToPhase('assessment', 'go');

      const state = engine.getState();
      expect(state.phaseHistory).toHaveLength(2);
      expect(state.phaseHistory[0].from).toBe('history');
      expect(state.phaseHistory[0].to).toBe('preparation');
      expect(state.phaseHistory[1].from).toBe('preparation');
      expect(state.phaseHistory[1].to).toBe('assessment');
    });

    it('canTransitionTo returns correct values', () => {
      expect(engine.canTransitionTo('preparation')).toBe(true);
      expect(engine.canTransitionTo('closure')).toBe(false);
    });

    it('should allow desensitization to closure (incomplete processing)', () => {
      engine.startSession();
      engine.transitionToPhase('preparation', 'r');
      engine.transitionToPhase('assessment', 'r');
      engine.transitionToPhase('desensitization', 'r');
      expect(engine.canTransitionTo('closure')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // SUDS recording
  // -----------------------------------------------------------------------

  describe('SUDS recording', () => {
    it('should record and retrieve SUDS', () => {
      engine.recordSuds(7, 'initial');
      expect(engine.getLatestSuds()).toBe(7);
      expect(engine.getSudsHistory()).toHaveLength(1);
    });

    it('should clamp SUDS to 0-10', () => {
      engine.recordSuds(-5, 'below');
      expect(engine.getLatestSuds()).toBe(0);

      engine.recordSuds(15, 'above');
      expect(engine.getLatestSuds()).toBe(10);
    });

    it('should round SUDS to nearest integer', () => {
      engine.recordSuds(3.7, 'fractional');
      expect(engine.getLatestSuds()).toBe(4);
    });

    it('should return null when no SUDS recorded', () => {
      expect(engine.getLatestSuds()).toBeNull();
    });

    it('should track SUDS history', () => {
      engine.recordSuds(8, 'start');
      engine.recordSuds(5, 'mid');
      engine.recordSuds(2, 'end');
      const history = engine.getSudsHistory();
      expect(history).toHaveLength(3);
      expect(history.map((r) => r.value)).toEqual([8, 5, 2]);
    });
  });

  // -----------------------------------------------------------------------
  // VOC recording
  // -----------------------------------------------------------------------

  describe('VOC recording', () => {
    it('should record and retrieve VOC', () => {
      engine.recordVoc(3, 'initial');
      expect(engine.getLatestVoc()).toBe(3);
      expect(engine.getVocHistory()).toHaveLength(1);
    });

    it('should clamp VOC to 1-7', () => {
      engine.recordVoc(0, 'below');
      expect(engine.getLatestVoc()).toBe(1);

      engine.recordVoc(10, 'above');
      expect(engine.getLatestVoc()).toBe(7);
    });

    it('should return null when no VOC recorded', () => {
      expect(engine.getLatestVoc()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Emotion recording
  // -----------------------------------------------------------------------

  describe('emotion recording', () => {
    it('should record and retrieve emotions', () => {
      const snap = makeSnapshot();
      engine.recordEmotion(snap);
      expect(engine.getEmotionTrack()).toHaveLength(1);
    });

    it('should average emotions over last N snapshots', () => {
      engine.recordEmotion(makeSnapshot({ stress: 0.2 }));
      engine.recordEmotion(makeSnapshot({ stress: 0.4 }));
      engine.recordEmotion(makeSnapshot({ stress: 0.6 }));

      const avg = engine.getAverageEmotions(2);
      // Average of last 2: (0.4 + 0.6) / 2 = 0.5
      expect(avg.stress).toBeCloseTo(0.5, 5);
    });

    it('should return zeroes when no emotions recorded', () => {
      const avg = engine.getAverageEmotions(5);
      expect(avg.stress).toBe(0);
      expect(avg.engagement).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // BLS management
  // -----------------------------------------------------------------------

  describe('BLS management', () => {
    it('should start and end BLS sets', () => {
      engine.startBlsSet();
      engine.endBlsSet();
      expect(engine.getBlsSetsCompleted()).toBe(1);
    });

    it('should increment BLS count on each endBlsSet', () => {
      engine.startBlsSet();
      engine.endBlsSet();
      engine.startBlsSet();
      engine.endBlsSet();
      expect(engine.getBlsSetsCompleted()).toBe(2);
    });

    it('should adapt BLS config', () => {
      engine.adaptBls({ speed: 0.5, pattern: 'circular' }, 'high stress');
      const config = engine.getBlsConfig();
      expect(config.speed).toBe(0.5);
      expect(config.pattern).toBe('circular');
      // Unchanged fields remain
      expect(config.type).toBe('eye_movement');
      expect(config.setLength).toBe(24);
    });
  });

  // -----------------------------------------------------------------------
  // Timeline events
  // -----------------------------------------------------------------------

  describe('timeline events', () => {
    it('should record timeline events on phase start', () => {
      engine.startSession();
      const timeline = engine.getTimeline();
      expect(timeline.length).toBeGreaterThanOrEqual(1);
      expect(timeline[0].type).toBe('phase_start');
    });

    it('should add custom timeline events', () => {
      engine.addTimelineEvent({
        timestamp: Date.now(),
        type: 'ai_utterance',
        data: { text: 'How are you feeling?' },
      });
      expect(engine.getTimeline()).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Safety events
  // -----------------------------------------------------------------------

  describe('safety events', () => {
    it('should record and retrieve safety events', () => {
      const event: SafetyEvent = {
        timestamp: Date.now(),
        type: 'dissociation',
        severity: 'critical',
        actionTaken: 'grounding_54321',
        resolved: false,
      };
      engine.reportSafetyEvent(event);
      expect(engine.getSafetyEvents()).toHaveLength(1);
      // Also adds to timeline
      const timeline = engine.getTimeline();
      expect(timeline.some((e) => e.type === 'safety_alert')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Event emissions
  // -----------------------------------------------------------------------

  describe('event emissions', () => {
    it('should emit phaseChanged on transition', () => {
      const listener = jest.fn();
      engine.on('phaseChanged', listener);
      engine.startSession();
      engine.transitionToPhase('preparation', 'ready');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].to).toBe('preparation');
    });

    it('should emit sudsRecorded on recordSuds', () => {
      const listener = jest.fn();
      engine.on('sudsRecorded', listener);
      engine.recordSuds(5, 'mid');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].value).toBe(5);
    });

    it('should emit vocRecorded on recordVoc', () => {
      const listener = jest.fn();
      engine.on('vocRecorded', listener);
      engine.recordVoc(4, 'mid');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].value).toBe(4);
    });

    it('should emit sessionEnded with export data', () => {
      const listener = jest.fn();
      engine.on('sessionEnded', listener);
      engine.startSession();
      engine.endSession('safe place', 'calm');
      expect(listener).toHaveBeenCalledTimes(1);
      const exported: FullSessionExport = listener.mock.calls[0][0];
      expect(exported.sessionId).toBe('session-1');
      expect(exported.closureTechnique).toBe('safe place');
      expect(exported.clientStateAtEnd).toBe('calm');
    });

    it('should emit sessionPaused and sessionResumed', () => {
      const pauseListener = jest.fn();
      const resumeListener = jest.fn();
      engine.on('sessionPaused', pauseListener);
      engine.on('sessionResumed', resumeListener);

      engine.startSession();
      engine.pauseSession();
      expect(pauseListener).toHaveBeenCalledTimes(1);

      engine.resumeSession();
      expect(resumeListener).toHaveBeenCalledTimes(1);
    });

    it('should emit blsStarted and blsStopped', () => {
      const startListener = jest.fn();
      const stopListener = jest.fn();
      engine.on('blsStarted', startListener);
      engine.on('blsStopped', stopListener);

      engine.startBlsSet();
      expect(startListener).toHaveBeenCalledTimes(1);

      engine.endBlsSet();
      expect(stopListener).toHaveBeenCalledTimes(1);
    });

    it('should emit safetyAlert on reportSafetyEvent', () => {
      const listener = jest.fn();
      engine.on('safetyAlert', listener);
      engine.reportSafetyEvent({
        timestamp: Date.now(),
        type: 'high_stress',
        severity: 'medium',
        actionTaken: 'slow_bls',
        resolved: false,
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should emit emotionRecorded on recordEmotion', () => {
      const listener = jest.fn();
      engine.on('emotionRecorded', listener);
      engine.recordEmotion(makeSnapshot());
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should emit blsAdapted on adaptBls', () => {
      const listener = jest.fn();
      engine.on('blsAdapted', listener);
      engine.adaptBls({ speed: 0.7 }, 'stress reduction');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Session export
  // -----------------------------------------------------------------------

  describe('session export', () => {
    it('should export complete session data', () => {
      engine.startSession();
      engine.setTarget(makeTarget());
      engine.recordSuds(7, 'start');
      engine.recordVoc(2, 'start');
      engine.recordEmotion(makeSnapshot());

      const exported = engine.exportSessionData();
      expect(exported.sessionId).toBe('session-1');
      expect(exported.userId).toBe('user-1');
      expect(exported.target).not.toBeNull();
      expect(exported.sudsHistory).toHaveLength(1);
      expect(exported.vocHistory).toHaveLength(1);
      expect(exported.emotionTrack).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Target memory
  // -----------------------------------------------------------------------

  describe('target memory', () => {
    it('should set and get target', () => {
      expect(engine.getTarget()).toBeNull();
      const target = makeTarget();
      engine.setTarget(target);
      expect(engine.getTarget()).toEqual(target);
    });
  });

  // -----------------------------------------------------------------------
  // Elapsed time
  // -----------------------------------------------------------------------

  describe('elapsed time tracking', () => {
    it('should track elapsed seconds while active', () => {
      engine.startSession();
      expect(engine.getElapsedSeconds()).toBe(0);

      jest.advanceTimersByTime(3000);
      expect(engine.getElapsedSeconds()).toBe(3);
    });

    it('should not increment time while paused', () => {
      engine.startSession();
      jest.advanceTimersByTime(2000);
      expect(engine.getElapsedSeconds()).toBe(2);

      engine.pauseSession();
      jest.advanceTimersByTime(5000);
      expect(engine.getElapsedSeconds()).toBe(2); // unchanged

      engine.resumeSession();
      jest.advanceTimersByTime(1000);
      expect(engine.getElapsedSeconds()).toBe(3);
    });

    it('should stop timer on session end', () => {
      engine.startSession();
      jest.advanceTimersByTime(2000);
      engine.endSession('safe place', 'calm');
      jest.advanceTimersByTime(5000);
      expect(engine.getElapsedSeconds()).toBe(2);
    });
  });
});
