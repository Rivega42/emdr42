/**
 * React-хук для WebRTC-сессии терапевт↔пациент через LiveKit.
 *
 * Использование:
 *   const { connect, disconnect, localAudio, remoteAudio, isConnected } = useLiveKit();
 *   await connect(livekitUrl, token);
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from 'livekit-client';

export interface LiveKitState {
  isConnected: boolean;
  isConnecting: boolean;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  remoteParticipant: string | null;
  error: string | null;
}

export function useLiveKit() {
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<LiveKitState>({
    isConnected: false,
    isConnecting: false,
    localAudioEnabled: false,
    localVideoEnabled: false,
    remoteParticipant: null,
    error: null,
  });
  const [remoteVideoEl, setRemoteVideoEl] = useState<HTMLVideoElement | null>(null);
  const [remoteAudioEl, setRemoteAudioEl] = useState<HTMLAudioElement | null>(null);

  /** Подключение к комнате LiveKit */
  const connect = useCallback(async (url: string, token: string) => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video && remoteVideoEl) {
          track.attach(remoteVideoEl);
        } else if (track.kind === Track.Kind.Audio && remoteAudioEl) {
          track.attach(remoteAudioEl);
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        setState((s) => ({ ...s, remoteParticipant: participant.identity }));
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setState((s) => ({ ...s, remoteParticipant: null }));
      });

      room.on(RoomEvent.Disconnected, () => {
        setState((s) => ({ ...s, isConnected: false, remoteParticipant: null }));
      });

      await room.connect(url, token);
      setState((s) => ({ ...s, isConnected: true, isConnecting: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Ошибка подключения',
      }));
    }
  }, [remoteVideoEl, remoteAudioEl]);

  /** Включить/выключить микрофон */
  const toggleAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(!state.localAudioEnabled);
    setState((s) => ({ ...s, localAudioEnabled: !s.localAudioEnabled }));
  }, [state.localAudioEnabled]);

  /** Включить/выключить камеру */
  const toggleVideo = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    await room.localParticipant.setCameraEnabled(!state.localVideoEnabled);
    setState((s) => ({ ...s, localVideoEnabled: !s.localVideoEnabled }));
  }, [state.localVideoEnabled]);

  /** Отключение */
  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setState({
      isConnected: false,
      isConnecting: false,
      localAudioEnabled: false,
      localVideoEnabled: false,
      remoteParticipant: null,
      error: null,
    });
  }, []);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    setRemoteVideoEl,
    setRemoteAudioEl,
  };
}
