/**
 * VoiceHandler tests
 */

import { VoiceHandler } from '../voice-handler';
import type { Socket } from 'socket.io';
import type { SessionHandler } from '../session-handler';
import WebSocket from 'ws';

// Mock dependencies
jest.mock('ws');

describe('VoiceHandler', () => {
  let mockSocket: jest.Mocked<Socket>;
  let mockSessionHandler: jest.Mocked<SessionHandler>;
  let voiceHandler: VoiceHandler;

  const config = {
    voskUrl: 'ws://localhost:2700',
    piperUrl: 'http://localhost:5000',
    sampleRate: 16000,
    language: 'en-us',
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock socket
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as jest.Mocked<Socket>;

    // Mock session handler
    mockSessionHandler = {
      handlePatientMessageForVoice: jest.fn().mockResolvedValue('AI response'),
    } as unknown as jest.Mocked<SessionHandler>;

    // Mock WebSocket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockWs: any = {
      on: jest.fn((event: string, callback: (...args: unknown[]) => void): unknown => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
        return mockWs;
      }),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    };
    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

    voiceHandler = new VoiceHandler(
      mockSocket,
      'test-session-id',
      config,
      mockSessionHandler
    );
  });

  afterEach(() => {
    voiceHandler.stop();
  });

  describe('start()', () => {
    it('should connect to Vosk WebSocket', async () => {
      await voiceHandler.start();

      expect(WebSocket).toHaveBeenCalledWith(config.voskUrl);
      expect(voiceHandler.isVoiceActive()).toBe(true);
    });

    it('should configure Vosk with correct settings', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWs: any = {
        on: jest.fn((event: string, callback: (...args: unknown[]) => void): unknown => {
          if (event === 'open') {
            setTimeout(() => callback(), 0);
          }
          return mockWs;
        }),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      };
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      await voiceHandler.start();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"sample_rate":16000')
      );
    });
  });

  describe('stop()', () => {
    it('should close Vosk connection', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWs: any = {
        on: jest.fn((event: string, callback: (...args: unknown[]) => void): unknown => {
          if (event === 'open') {
            setTimeout(() => callback(), 0);
          }
          return mockWs;
        }),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      };
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      await voiceHandler.start();
      voiceHandler.stop();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"eof":1')
      );
      expect(mockWs.close).toHaveBeenCalled();
      expect(voiceHandler.isVoiceActive()).toBe(false);
    });
  });

  describe('handleAudioChunk()', () => {
    it('should forward audio to Vosk', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWs: any = {
        on: jest.fn((event: string, callback: (...args: unknown[]) => void): unknown => {
          if (event === 'open') {
            setTimeout(() => callback(), 0);
          }
          return mockWs;
        }),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      };
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      await voiceHandler.start();

      const audioBuffer = new ArrayBuffer(100);
      voiceHandler.handleAudioChunk(audioBuffer);

      expect(mockWs.send).toHaveBeenCalledWith(Buffer.from(audioBuffer));
    });

    it('should not send audio when inactive', () => {
      const mockWs = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      };
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      const audioBuffer = new ArrayBuffer(100);
      voiceHandler.handleAudioChunk(audioBuffer);

      // Should not send because voiceHandler is not started
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('isVoiceActive()', () => {
    it('should return false initially', () => {
      expect(voiceHandler.isVoiceActive()).toBe(false);
    });

    it('should return true after start', async () => {
      await voiceHandler.start();
      expect(voiceHandler.isVoiceActive()).toBe(true);
    });

    it('should return false after stop', async () => {
      await voiceHandler.start();
      voiceHandler.stop();
      expect(voiceHandler.isVoiceActive()).toBe(false);
    });
  });
});
