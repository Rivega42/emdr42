import { AiDialogue } from '../ai-dialogue';

// Mock AiRouter
const mockAiRouter = {
  chatStream: jest.fn(),
};

// Helper to create an async generator from chunks
async function* mockStream(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe('AiDialogue', () => {
  let dialogue: AiDialogue;

  beforeEach(() => {
    dialogue = new AiDialogue(mockAiRouter as any, 'You are an EMDR therapist.');
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('adds user message to history', async () => {
      mockAiRouter.chatStream.mockReturnValue(mockStream(['Hello']));

      const gen = dialogue.sendMessage('Hi there', '');
      // Consume the generator
      for await (const _ of gen) { /* consume */ }

      const history = dialogue.getHistory();
      expect(history[0]).toEqual({ role: 'user', content: 'Hi there' });
    });

    it('calls router chatStream with correct messages', async () => {
      mockAiRouter.chatStream.mockReturnValue(mockStream(['Response']));

      const gen = dialogue.sendMessage('Hello', 'Phase: history');
      for await (const _ of gen) { /* consume */ }

      expect(mockAiRouter.chatStream).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('You are an EMDR therapist.'),
          }),
          expect.objectContaining({ role: 'user', content: 'Hello' }),
        ]),
      );
    });

    it('collects and returns full response', async () => {
      mockAiRouter.chatStream.mockReturnValue(
        mockStream(['Hello, ', 'how ', 'are you?']),
      );

      const gen = dialogue.sendMessage('Hi', '');
      const chunks: string[] = [];
      for await (const chunk of gen) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello, ', 'how ', 'are you?']);

      // Full response should be in history
      const history = dialogue.getHistory();
      const assistantMsg = history.find((m) => m.role === 'assistant');
      expect(assistantMsg?.content).toBe('Hello, how are you?');
    });
  });

  describe('getHistory', () => {
    it('returns conversation history', async () => {
      mockAiRouter.chatStream.mockReturnValue(mockStream(['Reply 1']));
      const gen1 = dialogue.sendMessage('Msg 1', '');
      for await (const _ of gen1) { /* consume */ }

      mockAiRouter.chatStream.mockReturnValue(mockStream(['Reply 2']));
      const gen2 = dialogue.sendMessage('Msg 2', '');
      for await (const _ of gen2) { /* consume */ }

      const history = dialogue.getHistory();
      expect(history).toHaveLength(4); // 2 user + 2 assistant
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
      expect(history[2].role).toBe('user');
      expect(history[3].role).toBe('assistant');
    });
  });

  describe('analyzeResponse', () => {
    it('detects phase transition hints ("let\'s move to installation")', () => {
      const result = dialogue.analyzeResponse(
        "Great progress. Let's move to installation of the positive belief.",
      );

      expect(result.suggestsTransition).toBe(true);
      expect(result.nextPhase).toBe('installation');
    });

    it('returns false for normal responses', () => {
      const result = dialogue.analyzeResponse(
        'Tell me more about how that memory makes you feel.',
      );

      expect(result.suggestsTransition).toBe(false);
      expect(result.nextPhase).toBeUndefined();
    });
  });

  describe('updateSystemPrompt', () => {
    it('changes the system prompt', async () => {
      dialogue.updateSystemPrompt('New system prompt for desensitization.');

      mockAiRouter.chatStream.mockReturnValue(mockStream(['OK']));
      const gen = dialogue.sendMessage('Test', '');
      for await (const _ of gen) { /* consume */ }

      expect(mockAiRouter.chatStream).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('New system prompt for desensitization.'),
          }),
        ]),
      );
    });
  });

  describe('conversation context', () => {
    it('includes system prompt in messages', async () => {
      mockAiRouter.chatStream.mockReturnValue(mockStream(['Hi']));

      const gen = dialogue.sendMessage('Hello', 'Phase: history\nSUDS: 7');
      for await (const _ of gen) { /* consume */ }

      const call = mockAiRouter.chatStream.mock.calls[0][0];
      const systemMsg = call.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('You are an EMDR therapist.');
      expect(systemMsg.content).toContain('Phase: history');
      expect(systemMsg.content).toContain('SUDS: 7');
    });
  });
});
