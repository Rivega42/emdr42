'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { VoiceCapture, type VoiceState } from '@/lib/voice-capture';

/**
 * Общая логика voice-капчи + воспроизведения AI-аудио (#111).
 *
 * Раньше дублировалась между `VoiceButton` и `VoiceButtonCompact`: refs
 * (capture/audioContext/audioQueue/isPlaying), `playAudioQueue` с
 * timeout-страховкой (#234), toggle, cleanup. Из-за дублирования любой
 * фикс пайплайна (например #234) приходилось делать в двух местах.
 *
 * Hook:
 *  - Управляет VoiceCapture lifecycle (init / dispose)
 *  - Воспроизводит входящие audio-чанки последовательно (queue) с
 *    timeout-страховкой (если onended не стрельнул — не зависаем)
 *  - Прокидывает наружу: voiceState, isEnabled, permissionDenied, toggle,
 *    transcript, handleAiAudio (для теста / прямого вызова)
 *  - Cleanup при unmount: dispose капчи + close AudioContext
 */
export interface UseVoiceOptions {
  socket: Socket | null;
  sessionId: string | null;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceResult {
  voiceState: VoiceState;
  isEnabled: boolean;
  /** Заполняется промежуточным транскриптом (для отображения "что слышим"). */
  transcript: string;
  permissionDenied: boolean;
  toggle: () => Promise<void>;
}

export function useVoice({
  socket,
  sessionId,
  onTranscript,
  onError,
}: UseVoiceOptions): UseVoiceResult {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isEnabled, setIsEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const voiceCaptureRef = useRef<VoiceCapture | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (!audioData) continue;

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const audioBuffer = await audioContextRef.current.decodeAudioData(
          audioData.slice(0), // clone — иначе buffer detached в Safari
        );
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        // Timeout-страховка (#234): если AudioContext закрыт или buffer
        // битый — onended может не стрельнуть. Без таймаута очередь
        // зависала бы навсегда.
        const timeoutMs = audioBuffer.duration * 1000 + 2000;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, timeoutMs);
          source.onended = () => {
            clearTimeout(timer);
            resolve();
          };
          try {
            source.start();
          } catch {
            clearTimeout(timer);
            resolve();
          }
        });
      } catch (err) {
        // Глотаем — пайплайн продолжает работать со следующим чанком
        // eslint-disable-next-line no-console
        console.error('[useVoice] Audio playback error:', err);
      }
    }

    isPlayingRef.current = false;
  }, []);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setTranscript(isFinal ? '' : text);
      onTranscript?.(text, isFinal);
    },
    [onTranscript],
  );

  const handleAiAudio = useCallback(
    (audioData: ArrayBuffer) => {
      audioQueueRef.current.push(audioData);
      void playAudioQueue();
    },
    [playAudioQueue],
  );

  const handleError = useCallback(
    (error: string) => {
      // eslint-disable-next-line no-console
      console.error('[useVoice] Error:', error);
      if (error.includes('Permission denied') || error.includes('NotAllowedError')) {
        setPermissionDenied(true);
      }
      onError?.(error);
    },
    [onError],
  );

  const toggle = useCallback(async () => {
    if (!socket || !sessionId) return;

    if (isEnabled) {
      voiceCaptureRef.current?.stop();
      voiceCaptureRef.current?.dispose();
      voiceCaptureRef.current = null;
      setIsEnabled(false);
      setVoiceState('idle');
      setTranscript('');
      return;
    }

    try {
      const capture = new VoiceCapture(socket, sessionId, {
        onStateChange: setVoiceState,
        onTranscript: handleTranscript,
        onAiAudio: handleAiAudio,
        onError: handleError,
      });
      await capture.start();
      voiceCaptureRef.current = capture;
      setIsEnabled(true);
      setPermissionDenied(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useVoice] Failed to start voice:', err);
      if (
        err instanceof Error &&
        (err.message.includes('Permission denied') || err.name === 'NotAllowedError')
      ) {
        setPermissionDenied(true);
      }
    }
  }, [socket, sessionId, isEnabled, handleTranscript, handleAiAudio, handleError]);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      voiceCaptureRef.current?.dispose();
      audioContextRef.current?.close().catch(() => void 0);
    };
  }, []);

  return {
    voiceState,
    isEnabled,
    transcript,
    permissionDenied,
    toggle,
  };
}
