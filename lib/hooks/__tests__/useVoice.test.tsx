import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoice } from '../useVoice';

// Мок VoiceCapture — конструируется, start/stop/dispose шпионятся.
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn();
const mockDispose = jest.fn();
let lastCaptureOpts: any = null;

jest.mock('@/lib/voice-capture', () => ({
  VoiceCapture: jest.fn().mockImplementation((_socket, _id, opts) => {
    lastCaptureOpts = opts;
    return { start: mockStart, stop: mockStop, dispose: mockDispose };
  }),
}));

const fakeSocket = {} as any;

describe('useVoice (#111)', () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockStop.mockClear();
    mockDispose.mockClear();
    lastCaptureOpts = null;
  });

  it('idle по умолчанию, toggle = no-op без socket/sessionId', async () => {
    const { result } = renderHook(() => useVoice({ socket: null, sessionId: null }));
    expect(result.current.voiceState).toBe('idle');
    expect(result.current.isEnabled).toBe(false);
    await act(() => result.current.toggle());
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('toggle включает: создаёт VoiceCapture и стартует', async () => {
    const { result } = renderHook(() => useVoice({ socket: fakeSocket, sessionId: 's1' }));
    await act(() => result.current.toggle());
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(result.current.isEnabled).toBe(true);
  });

  it('повторный toggle выключает: stop + dispose, isEnabled=false', async () => {
    const { result } = renderHook(() => useVoice({ socket: fakeSocket, sessionId: 's1' }));
    await act(() => result.current.toggle());
    await act(() => result.current.toggle());
    expect(mockStop).toHaveBeenCalled();
    expect(mockDispose).toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(false);
  });

  it('onTranscript прокидывается через handler в опции VoiceCapture', async () => {
    const onTranscript = jest.fn();
    const { result } = renderHook(() =>
      useVoice({ socket: fakeSocket, sessionId: 's1', onTranscript }),
    );
    await act(() => result.current.toggle());
    // Симулируем неполный транскрипт от VoiceCapture
    act(() => lastCaptureOpts.onTranscript('hi', false));
    await waitFor(() => expect(result.current.transcript).toBe('hi'));
    expect(onTranscript).toHaveBeenCalledWith('hi', false);

    // Финальный → очищает transcript state
    act(() => lastCaptureOpts.onTranscript('hello', true));
    await waitFor(() => expect(result.current.transcript).toBe(''));
  });

  it('Permission denied error выставляет permissionDenied=true', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useVoice({ socket: fakeSocket, sessionId: 's1', onError }));
    await act(() => result.current.toggle());
    act(() => lastCaptureOpts.onError('NotAllowedError: Permission denied'));
    await waitFor(() => expect(result.current.permissionDenied).toBe(true));
    expect(onError).toHaveBeenCalled();
  });

  it('voiceState обновляется через onStateChange', async () => {
    const { result } = renderHook(() => useVoice({ socket: fakeSocket, sessionId: 's1' }));
    await act(() => result.current.toggle());
    act(() => lastCaptureOpts.onStateChange('listening'));
    await waitFor(() => expect(result.current.voiceState).toBe('listening'));
  });

  it('cleanup при unmount: dispose капчи', async () => {
    const { result, unmount } = renderHook(() => useVoice({ socket: fakeSocket, sessionId: 's1' }));
    await act(() => result.current.toggle());
    mockDispose.mockClear();
    unmount();
    expect(mockDispose).toHaveBeenCalled();
  });
});
