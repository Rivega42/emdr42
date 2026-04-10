import { SessionHandler } from '../session-handler';

// ---- Mocks for @emdr42/emdr-engine ----

const mockEngine = {
  startSession: jest.fn(),
  endSession: jest.fn(),
  pauseSession: jest.fn(),
  resumeSession: jest.fn(),
  recordEmotion: jest.fn(),
  recordSuds: jest.fn(),
  recordVoc: jest.fn(),
  reportSafetyEvent: jest.fn(),
  addTimelineEvent: jest.fn(),
  getState: jest.fn().mockReturnValue({
    currentPhase: 'history',
    elapsedSeconds: 120,
    blsSetsCompleted: 3,
  }),
  getCurrentPhase: jest.fn().mockReturnValue('history'),
  getBlsConfig: jest.fn().mockReturnValue({
    speed: 1,
    pattern: 'horizontal',
    setLength: 30,
  }),
  getBlsSetsCompleted: jest.fn().mockReturnValue(3),
  getSudsHistory: jest.fn().mockReturnValue([]),
  getLatestSuds: jest.fn().mockReturnValue(7),
  getLatestVoc: jest.fn().mockReturnValue(3),
  getAverageEmotions: jest.fn().mockReturnValue({
    stress: 0.5,
    engagement: 0.6,
    valence: 0.4,
    confidence: 0.8,
  }),
  getTarget: jest.fn().mockReturnValue(null),
  exportSessionData: jest.fn().mockReturnValue({
    endedAt: Date.now(),
    elapsedSeconds: 3600,
    blsSetsCompleted: 12,
    phases: ['history', 'preparation'],
    safetyEvents: [],
  }),
  canTransitionTo: jest.fn().mockReturnValue(false),
  transitionToPhase: jest.fn(),
  adaptBls: jest.fn(),
};

const mockSafetyMonitor = {
  analyzeEmotion: jest.fn().mockReturnValue({ safe: true, events: [] }),
  isSafeToContinue: jest.fn().mockReturnValue({ safe: true }),
};

const mockAdaptiveController = {
  shouldTransitionPhase: jest.fn().mockReturnValue({ transition: false }),
  calculateBlsParams: jest.fn().mockReturnValue({
    speed: 1,
    pattern: 'horizontal',
    setLength: 30,
  }),
  suggestInterweave: jest.fn().mockReturnValue(null),
};

jest.mock('@emdr42/emdr-engine', () => ({
  EmdrSessionEngine: jest.fn().mockImplementation(() => mockEngine),
  SafetyMonitor: jest.fn().mockImplementation(() => mockSafetyMonitor),
  AdaptiveController: jest.fn().mockImplementation(() => mockAdaptiveController),
  EMDR_SYSTEM_PROMPT: 'Base EMDR system prompt.',
  PHASE_PROMPTS: {
    history: 'History phase prompt.',
    preparation: 'Preparation phase prompt.',
    assessment: 'Assessment phase prompt.',
    desensitization: 'Desensitization phase prompt.',
    installation: 'Installation phase prompt.',
    body_scan: 'Body scan phase prompt.',
    closure: 'Closure phase prompt.',
    reevaluation: 'Reevaluation phase prompt.',
  },
  SAFETY_PROMPTS: {
    grounding_54321: '5-4-3-2-1 grounding technique instructions.',
  },
}));

// ---- Mocks for AiDialogue ----

const mockAiDialogue = {
  sendMessage: jest.fn(),
  getHistory: jest.fn().mockReturnValue([]),
  analyzeResponse: jest.fn().mockReturnValue({ suggestsTransition: false }),
  updateSystemPrompt: jest.fn(),
};

jest.mock('../ai-dialogue', () => ({
  AiDialogue: jest.fn().mockImplementation(() => mockAiDialogue),
}));

// ---- Mock socket and BackendClient ----

const mockSocket = {
  emit: jest.fn(),
  id: 'test-socket-id',
};

const mockBackendClient = {
  createSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
  updateSession: jest.fn().mockResolvedValue({}),
  addTimelineEvent: jest.fn().mockResolvedValue(undefined),
  addEmotionRecords: jest.fn().mockResolvedValue(undefined),
  addSudsRecord: jest.fn().mockResolvedValue(undefined),
  addVocRecord: jest.fn().mockResolvedValue(undefined),
  addSafetyEvent: jest.fn().mockResolvedValue(undefined),
};

// Helper to create an async generator
async function* mockStream(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe('SessionHandler', () => {
  let handler: SessionHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset default mock returns
    mockAiDialogue.sendMessage.mockReturnValue(
      mockStream(['Hello, ', 'welcome to the session.']),
    );
    mockAiDialogue.analyzeResponse.mockReturnValue({
      suggestsTransition: false,
    });
    mockAdaptiveController.shouldTransitionPhase.mockReturnValue({
      transition: false,
    });
    mockSafetyMonitor.analyzeEmotion.mockReturnValue({
      safe: true,
      events: [],
    });

    handler = new SessionHandler(
      mockSocket as any,
      'session-1',
      'user-1',
      {} as any, // aiRouter (passed to AiDialogue constructor)
      mockBackendClient as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start', () => {
    it('initializes engine and sends first AI message', async () => {
      await handler.start();

      expect(mockEngine.startSession).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:ai_response',
        expect.objectContaining({ type: 'chunk' }),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:ai_response',
        expect.objectContaining({ type: 'complete' }),
      );
    });

    it('creates session in backend', async () => {
      await handler.start();

      expect(mockBackendClient.createSession).toHaveBeenCalledWith({});
    });
  });

  describe('handlePatientMessage', () => {
    it('sends message to AI with context', async () => {
      await handler.start();
      jest.clearAllMocks();

      mockAiDialogue.sendMessage.mockReturnValue(
        mockStream(['I understand.']),
      );

      await handler.handlePatientMessage('I feel anxious');

      expect(mockAiDialogue.sendMessage).toHaveBeenCalledWith(
        'I feel anxious',
        expect.any(String),
      );
    });

    it('records timeline event', async () => {
      await handler.start();
      jest.clearAllMocks();

      mockAiDialogue.sendMessage.mockReturnValue(
        mockStream(['Acknowledged.']),
      );

      await handler.handlePatientMessage('I had a bad dream');

      expect(mockBackendClient.addTimelineEvent).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          type: 'patient_utterance',
          data: { text: 'I had a bad dream' },
        }),
      );
    });
  });

  describe('handleEmotionUpdate', () => {
    const emotion = {
      timestamp: Date.now(),
      stress: 0.6,
      engagement: 0.7,
      positivity: 0.3,
      arousal: 0.5,
      valence: 0.4,
      joy: 0.1,
      sadness: 0.4,
      anger: 0.2,
      fear: 0.3,
      confidence: 0.9,
    };

    it('feeds emotion to safety monitor', () => {
      handler.handleEmotionUpdate(emotion);

      expect(mockEngine.recordEmotion).toHaveBeenCalledWith(emotion);
      expect(mockSafetyMonitor.analyzeEmotion).toHaveBeenCalledWith(
        emotion,
        expect.any(Object),
      );
    });

    it('adapts BLS when needed', () => {
      mockEngine.getCurrentPhase.mockReturnValue('desensitization');
      const newBlsConfig = { speed: 2, pattern: 'diagonal', setLength: 25 };
      mockAdaptiveController.calculateBlsParams.mockReturnValue(newBlsConfig);

      handler.handleEmotionUpdate(emotion);

      expect(mockAdaptiveController.calculateBlsParams).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:bls_config',
        newBlsConfig,
      );
    });

    it('emits safety alert on critical event', () => {
      mockSafetyMonitor.analyzeEmotion.mockReturnValue({
        safe: false,
        riskLevel: 'critical',
        events: [
          {
            timestamp: Date.now(),
            type: 'dissociation',
            severity: 'critical',
            actionTaken: 'pause',
            resolved: false,
          },
        ],
        intervention: {
          type: 'pause',
          instructions: 'Grounding exercise',
          priority: 'critical',
        },
      });

      handler.handleEmotionUpdate(emotion);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:safety_alert',
        expect.objectContaining({
          riskLevel: 'critical',
        }),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:intervention',
        expect.objectContaining({
          type: 'pause',
          priority: 'critical',
        }),
      );
    });
  });

  describe('handleSudsRating', () => {
    it('records SUDS in engine', () => {
      handler.handleSudsRating(5, 'mid-session');

      expect(mockEngine.recordSuds).toHaveBeenCalledWith(5, 'mid-session');
    });

    it('checks phase transition', () => {
      handler.handleSudsRating(0, 'post-set');

      expect(mockAdaptiveController.shouldTransitionPhase).toHaveBeenCalledWith(
        expect.any(Object),
      );
    });
  });

  describe('handleVocRating', () => {
    it('records VOC in engine', () => {
      handler.handleVocRating(6, 'installation');

      expect(mockEngine.recordVoc).toHaveBeenCalledWith(6, 'installation');
    });
  });

  describe('handleStopSignal', () => {
    it('pauses session and sends grounding', () => {
      handler.handleStopSignal();

      // Should pause BLS
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:bls_config',
        expect.objectContaining({ paused: true }),
      );

      // Should report safety event
      expect(mockEngine.reportSafetyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stop_signal',
          severity: 'high',
        }),
      );

      // Should emit grounding intervention
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:intervention',
        expect.objectContaining({
          type: 'pause',
          instructions: '5-4-3-2-1 grounding technique instructions.',
          priority: 'high',
        }),
      );
    });
  });

  describe('endSession', () => {
    it('exports session data and saves to backend', async () => {
      await handler.start();
      jest.clearAllMocks();

      await handler.endSession();

      expect(mockEngine.endSession).toHaveBeenCalledWith(
        'standard_closure',
        'session_ended_by_client',
      );
      expect(mockEngine.exportSessionData).toHaveBeenCalled();
      expect(mockBackendClient.updateSession).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          status: 'completed',
          blsSetsCompleted: 12,
        }),
      );
    });

    it('emits session_ended event', async () => {
      await handler.start();
      jest.clearAllMocks();

      await handler.endSession();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session:session_ended',
        expect.objectContaining({
          sessionId: 'session-1',
          blsSetsCompleted: 12,
        }),
      );
    });
  });
});
