/**
 * Spec для lib/use-livekit.ts (#150) — React-хук для WebRTC сессии терапевт↔пациент.
 *
 * livekit-client мокается целиком — реальный WebRTC недоступен в jsdom.
 * Полностью покрывает:
 * - initial state
 * - connect: success / error пути
 * - toggleAudio / toggleVideo: с room и без
 * - disconnect: room.disconnect + reset state
 * - cleanup при unmount
 * - room event handlers (TrackSubscribed, ParticipantConnected/Disconnected,
 *   Disconnected)
 */
import { act, renderHook } from '@testing-library/react';

// ---- Mock livekit-client ----
// jest.mock хостится в начало файла. Чтобы прокинуть массив instances без
// проблем с TDZ — храним его внутри самого мока и читаем через
// (livekit as any).__instances в тестах.

interface MockRoomType {
  listeners: Record<string, Array<(d?: any) => void>>;
  connect: jest.Mock;
  disconnect: jest.Mock;
  localParticipant: {
    setMicrophoneEnabled: jest.Mock;
    setCameraEnabled: jest.Mock;
  };
  on: (event: string, cb: (d?: any) => void) => MockRoomType;
  __trigger: (event: string, data?: any) => void;
}

jest.mock('livekit-client', () => {
  const instances: MockRoomType[] = [];
  const config = { nextConnectError: null as unknown };
  class MockRoom implements MockRoomType {
    listeners: Record<string, Array<(d?: any) => void>> = {};
    connect = jest.fn(async (_url: string, _token: string) => {
      if (config.nextConnectError !== null) {
        const err = config.nextConnectError;
        config.nextConnectError = null;
        throw err;
      }
    });
    disconnect = jest.fn();
    localParticipant = {
      setMicrophoneEnabled: jest.fn(async (_v: boolean) => {}),
      setCameraEnabled: jest.fn(async (_v: boolean) => {}),
    };
    on(event: string, cb: (d?: any) => void) {
      (this.listeners[event] ||= []).push(cb);
      return this;
    }
    __trigger(event: string, data?: any) {
      (this.listeners[event] || []).forEach((cb) => cb(data));
    }
    constructor() {
      instances.push(this);
    }
  }
  return {
    Room: MockRoom,
    RoomEvent: {
      TrackSubscribed: 'trackSubscribed',
      ParticipantConnected: 'participantConnected',
      ParticipantDisconnected: 'participantDisconnected',
      Disconnected: 'disconnected',
    },
    Track: { Kind: { Video: 'video', Audio: 'audio' } },
    __instances: instances,
    __config: config,
  };
});

// Аксессор инстансов через мок-модуль (читается лениво — после хостинга).
const getInstances = (): MockRoomType[] => (require('livekit-client') as any).__instances;
const mockRoomInstances = new Proxy([] as MockRoomType[], {
  get(_t, prop) {
    const real = getInstances();
    // Длина и индексы прокидываются прозрачно
    return (real as any)[prop];
  },
  set(_t, prop, value) {
    const real = getInstances();
    (real as any)[prop] = value;
    return true;
  },
});

import { useLiveKit } from '../use-livekit';

beforeEach(() => {
  // Сбрасываем массив instances между тестами (длина=0 in-place)
  getInstances().length = 0;
});

describe('useLiveKit (#150)', () => {
  describe('initial state', () => {
    it('дефолтные значения после mount', () => {
      const { result } = renderHook(() => useLiveKit());
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.localAudioEnabled).toBe(false);
      expect(result.current.localVideoEnabled).toBe(false);
      expect(result.current.remoteParticipant).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('экспортирует API: connect/disconnect/toggleAudio/toggleVideo + setters', () => {
      const { result } = renderHook(() => useLiveKit());
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.toggleAudio).toBe('function');
      expect(typeof result.current.toggleVideo).toBe('function');
      expect(typeof result.current.setRemoteVideoEl).toBe('function');
      expect(typeof result.current.setRemoteAudioEl).toBe('function');
    });
  });

  describe('connect', () => {
    it('успешный коннект → isConnected=true, isConnecting=false', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk.example/', 'tok');
      });
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockRoomInstances[0].connect).toHaveBeenCalledWith('wss://lk.example/', 'tok');
    });

    it('ошибка коннекта → error выставлен из Error.message, isConnecting=false', async () => {
      const livekit = require('livekit-client');
      livekit.__config.nextConnectError = new Error('Token expired');

      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 'bad-tok');
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBe('Token expired');
    });

    it('ошибка не-Error объекта → дефолтное сообщение', async () => {
      const livekit = require('livekit-client');
      livekit.__config.nextConnectError = 'plain string';

      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 'tok');
      });

      expect(result.current.error).toBe('Ошибка подключения');
    });

    it('подписывается на 4 RoomEvent: TrackSubscribed, ParticipantConnected/Disconnected, Disconnected', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      const room = mockRoomInstances[0];
      expect(Object.keys(room.listeners).sort()).toEqual([
        'disconnected',
        'participantConnected',
        'participantDisconnected',
        'trackSubscribed',
      ]);
    });
  });

  describe('room events', () => {
    it('ParticipantConnected → state.remoteParticipant = participant.identity', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      const room = mockRoomInstances[0];

      act(() => {
        room.__trigger('participantConnected', { identity: 'patient-42' });
      });
      expect(result.current.remoteParticipant).toBe('patient-42');
    });

    it('ParticipantDisconnected → remoteParticipant=null', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      const room = mockRoomInstances[0];
      act(() => {
        room.__trigger('participantConnected', { identity: 'pt' });
      });
      act(() => {
        room.__trigger('participantDisconnected');
      });
      expect(result.current.remoteParticipant).toBeNull();
    });

    it('Disconnected → isConnected=false, remoteParticipant=null', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      const room = mockRoomInstances[0];
      act(() => {
        room.__trigger('participantConnected', { identity: 'pt' });
      });
      act(() => {
        room.__trigger('disconnected');
      });
      expect(result.current.isConnected).toBe(false);
      expect(result.current.remoteParticipant).toBeNull();
    });

    it('TrackSubscribed video → attach к remoteVideoEl', async () => {
      const { result } = renderHook(() => useLiveKit());
      const videoEl = document.createElement('video');
      act(() => result.current.setRemoteVideoEl(videoEl));

      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });

      const room = mockRoomInstances[0];
      const attach = jest.fn();
      act(() => {
        room.__trigger('trackSubscribed', { kind: 'video', attach });
      });
      expect(attach).toHaveBeenCalledWith(videoEl);
    });

    it('TrackSubscribed audio → attach к remoteAudioEl', async () => {
      const { result } = renderHook(() => useLiveKit());
      const audioEl = document.createElement('audio');
      act(() => result.current.setRemoteAudioEl(audioEl));

      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });

      const room = mockRoomInstances[0];
      const attach = jest.fn();
      act(() => {
        room.__trigger('trackSubscribed', { kind: 'audio', attach });
      });
      expect(attach).toHaveBeenCalledWith(audioEl);
    });

    it('TrackSubscribed video без videoEl → attach НЕ вызывается', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });

      const room = mockRoomInstances[0];
      const attach = jest.fn();
      act(() => {
        room.__trigger('trackSubscribed', { kind: 'video', attach });
      });
      expect(attach).not.toHaveBeenCalled();
    });
  });

  describe('toggleAudio / toggleVideo', () => {
    it('toggleAudio без коннекта → no-op', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.toggleAudio();
      });
      expect(result.current.localAudioEnabled).toBe(false);
    });

    it('toggleAudio после коннекта → setMicrophoneEnabled(true) + state.localAudioEnabled=true', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      await act(async () => {
        await result.current.toggleAudio();
      });
      expect(mockRoomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
      expect(result.current.localAudioEnabled).toBe(true);
    });

    it('toggleAudio дважды → возвращает в false', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      await act(async () => {
        await result.current.toggleAudio();
      });
      await act(async () => {
        await result.current.toggleAudio();
      });
      expect(result.current.localAudioEnabled).toBe(false);
      expect(mockRoomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenLastCalledWith(
        false,
      );
    });

    it('toggleVideo без коннекта → no-op', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.toggleVideo();
      });
      expect(result.current.localVideoEnabled).toBe(false);
    });

    it('toggleVideo после коннекта → setCameraEnabled(true) + state.localVideoEnabled=true', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      await act(async () => {
        await result.current.toggleVideo();
      });
      expect(mockRoomInstances[0].localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);
      expect(result.current.localVideoEnabled).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('после connect: room.disconnect + state сброшен', async () => {
      const { result } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      await act(async () => {
        await result.current.toggleAudio();
      });

      const room = mockRoomInstances[0];
      act(() => result.current.disconnect());

      expect(room.disconnect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.localAudioEnabled).toBe(false);
      expect(result.current.remoteParticipant).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('disconnect без коннекта — no-op', () => {
      const { result } = renderHook(() => useLiveKit());
      expect(() => act(() => result.current.disconnect())).not.toThrow();
    });
  });

  describe('cleanup на unmount', () => {
    it('размонтирование вызывает room.disconnect если коннект был', async () => {
      const { result, unmount } = renderHook(() => useLiveKit());
      await act(async () => {
        await result.current.connect('wss://lk', 't');
      });
      const room = mockRoomInstances[0];

      unmount();

      expect(room.disconnect).toHaveBeenCalled();
    });

    it('размонтирование без коннекта — без падений', () => {
      const { unmount } = renderHook(() => useLiveKit());
      expect(() => unmount()).not.toThrow();
    });
  });
});
