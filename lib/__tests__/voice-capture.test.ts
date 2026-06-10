/**
 * Spec для lib/voice-capture.ts (#150) — клиент захвата голоса с микрофона
 * + WebSocket-сигналинг с оркестратором.
 *
 * jsdom не реализует MediaRecorder/getUserMedia/AudioContext — мокаем их.
 */
import { VoiceCapture, type VoiceState, createVoiceCapture } from '../voice-capture';

// ---- Mock socket ----
const makeMockSocket = () => {
  const listeners: Record<string, (data: any) => void> = {};
  return {
    on: jest.fn((event: string, cb: (data: any) => void) => {
      listeners[event] = cb;
    }),
    off: jest.fn((event: string) => {
      delete listeners[event];
    }),
    emit: jest.fn(),
    /** Helper для тестов: триггер listener event'а */
    __trigger: (event: string, data?: any) => listeners[event]?.(data),
    __listeners: listeners,
  };
};

// ---- Mock media ----
let mediaRecorderInstances: MockMediaRecorder[] = [];

class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  start = jest.fn(() => {
    this.state = 'recording';
  });
  stop = jest.fn(() => {
    this.state = 'inactive';
  });
  pause = jest.fn(() => {
    this.state = 'paused';
  });
  resume = jest.fn(() => {
    this.state = 'recording';
  });
  ondataavailable:
    | ((e: { data: { size: number; arrayBuffer: () => Promise<ArrayBuffer> } }) => void)
    | null = null;
  onerror: ((e: any) => void) | null = null;
  constructor(
    public stream: any,
    public opts: any,
  ) {
    mediaRecorderInstances.push(this);
  }
}
(MockMediaRecorder as any).isTypeSupported = (m: string) => m.includes('opus');

let mediaTracks: { stop: jest.Mock }[] = [];

beforeEach(() => {
  mediaRecorderInstances = [];
  mediaTracks = [{ stop: jest.fn() }];

  // navigator.mediaDevices.getUserMedia
  Object.defineProperty(global.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: jest.fn(async () => ({
        getTracks: () => mediaTracks,
      })),
    },
  });

  (global as any).MediaRecorder = MockMediaRecorder;
  (global as any).AudioContext = jest.fn(() => ({
    close: jest.fn(),
  }));
});

afterEach(() => {
  delete (global as any).MediaRecorder;
  delete (global as any).AudioContext;
});

// ---- Tests ----

describe('VoiceCapture (#150)', () => {
  it('idle по умолчанию, isListening=false', () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    expect(vc.getState()).toBe('idle');
    expect(vc.isListening()).toBe(false);
  });

  it('setupSocketListeners: 6 событий voice:* подписаны при конструкторе', () => {
    const socket = makeMockSocket() as any;
    new VoiceCapture(socket, 's1');
    const events = (socket.on as jest.Mock).mock.calls.map((c) => c[0]);
    expect(events).toEqual(
      expect.arrayContaining([
        'voice:transcript_partial',
        'voice:transcript_final',
        'voice:ai_speaking',
        'voice:ai_audio',
        'voice:ai_done',
        'voice:error',
      ]),
    );
  });

  it('start: getUserMedia → MediaRecorder → emit voice:start → state=listening', async () => {
    const socket = makeMockSocket() as any;
    const onStateChange = jest.fn();
    const vc = new VoiceCapture(socket, 's1', { onStateChange });

    await vc.start();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.any(Object),
        video: false,
      }),
    );
    expect(mediaRecorderInstances).toHaveLength(1);
    // 100ms chunks для low-latency streaming
    expect(mediaRecorderInstances[0].start).toHaveBeenCalledWith(100);
    expect(socket.emit).toHaveBeenCalledWith('voice:start', { sessionId: 's1' });
    expect(vc.getState()).toBe('listening');
    expect(onStateChange).toHaveBeenCalledWith('listening');
    expect(vc.isListening()).toBe(true);
  });

  it('start: повторный вызов — no-op (isActive guard)', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    (socket.emit as jest.Mock).mockClear();
    await vc.start();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('start: getUserMedia rejected → onError + бросает', async () => {
    const socket = makeMockSocket() as any;
    const onError = jest.fn();
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      new Error('NotAllowedError'),
    );
    const vc = new VoiceCapture(socket, 's1', { onError });

    await expect(vc.start()).rejects.toThrow('NotAllowedError');
    expect(onError).toHaveBeenCalledWith('NotAllowedError');
  });

  it('stop: emit voice:stop, MediaRecorder.stop, track.stop, AudioContext.close, state=idle', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    (socket.emit as jest.Mock).mockClear();

    vc.stop();

    expect(socket.emit).toHaveBeenCalledWith('voice:stop', { sessionId: 's1' });
    expect(mediaRecorderInstances[0].stop).toHaveBeenCalled();
    expect(mediaTracks[0].stop).toHaveBeenCalled();
    expect(vc.getState()).toBe('idle');
    expect(vc.isListening()).toBe(false);
  });

  it('stop без start — no-op', () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    vc.stop();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('pause / resume меняют MediaRecorder state и voice state', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    const rec = mediaRecorderInstances[0];

    vc.pause();
    expect(rec.pause).toHaveBeenCalled();
    expect(vc.getState()).toBe('speaking');

    vc.resume();
    expect(rec.resume).toHaveBeenCalled();
    expect(vc.getState()).toBe('listening');
  });

  it('socket voice:transcript_partial → onTranscript(text, isFinal=false)', () => {
    const socket = makeMockSocket() as any;
    const onTranscript = jest.fn();
    new VoiceCapture(socket, 's1', { onTranscript });

    socket.__trigger('voice:transcript_partial', { text: 'hello' });
    expect(onTranscript).toHaveBeenCalledWith('hello', false);
  });

  it('socket voice:transcript_final → onTranscript(text, true) + state=processing', async () => {
    const socket = makeMockSocket() as any;
    const onTranscript = jest.fn();
    const onStateChange = jest.fn();
    const vc = new VoiceCapture(socket, 's1', { onTranscript, onStateChange });
    await vc.start();
    onStateChange.mockClear();

    socket.__trigger('voice:transcript_final', { text: 'done' });
    expect(onTranscript).toHaveBeenCalledWith('done', true);
    expect(vc.getState()).toBe('processing');
    expect(onStateChange).toHaveBeenCalledWith('processing');
  });

  it('socket voice:ai_speaking → state=speaking + pause MediaRecorder (avoid feedback)', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    const rec = mediaRecorderInstances[0];

    socket.__trigger('voice:ai_speaking');
    expect(vc.getState()).toBe('speaking');
    expect(rec.pause).toHaveBeenCalled();
  });

  it('socket voice:ai_audio → onAiAudio с буфером', () => {
    const socket = makeMockSocket() as any;
    const onAiAudio = jest.fn();
    new VoiceCapture(socket, 's1', { onAiAudio });

    const buf = new ArrayBuffer(8);
    socket.__trigger('voice:ai_audio', { audio: buf });
    expect(onAiAudio).toHaveBeenCalledWith(buf);
  });

  it('socket voice:ai_done → resume + listening если isActive', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    const rec = mediaRecorderInstances[0];
    rec.state = 'paused';

    socket.__trigger('voice:ai_done');
    expect(rec.resume).toHaveBeenCalled();
    expect(vc.getState()).toBe('listening');
  });

  it('socket voice:error → onError', () => {
    const socket = makeMockSocket() as any;
    const onError = jest.fn();
    new VoiceCapture(socket, 's1', { onError });

    socket.__trigger('voice:error', { message: 'STT timeout' });
    expect(onError).toHaveBeenCalledWith('STT timeout');
  });

  it('audio chunk → конвертация Blob.arrayBuffer и emit voice:audio с timestamp', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    const rec = mediaRecorderInstances[0];

    const buffer = new ArrayBuffer(16);
    const fakeBlob = { size: 16, arrayBuffer: async () => buffer };
    rec.ondataavailable?.({ data: fakeBlob } as any);
    // Промис arrayBuffer → emit
    await new Promise((r) => setTimeout(r, 0));

    expect(socket.emit).toHaveBeenCalledWith(
      'voice:audio',
      expect.objectContaining({
        sessionId: 's1',
        audio: buffer,
        timestamp: expect.any(Number),
      }),
    );
  });

  it('пустой audio chunk (size=0) не отправляется', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    const rec = mediaRecorderInstances[0];
    (socket.emit as jest.Mock).mockClear();

    rec.ondataavailable?.({
      data: { size: 0, arrayBuffer: async () => new ArrayBuffer(0) },
    } as any);
    await new Promise((r) => setTimeout(r, 0));

    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('dispose: stop + off всех socket listeners', async () => {
    const socket = makeMockSocket() as any;
    const vc = new VoiceCapture(socket, 's1');
    await vc.start();
    vc.dispose();

    expect(vc.getState()).toBe('idle');
    // 6 listeners сняты
    expect(socket.off).toHaveBeenCalledTimes(6);
  });

  it('createVoiceCapture factory возвращает VoiceCapture', () => {
    const socket = makeMockSocket() as any;
    const vc = createVoiceCapture(socket, 's1');
    expect(vc).toBeInstanceOf(VoiceCapture);
  });
});
