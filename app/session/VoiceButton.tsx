'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Socket } from 'socket.io-client';
import { VoiceCapture, type VoiceState } from '@/lib/voice-capture';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceButtonProps {
  socket: Socket | null;
  sessionId: string | null;
  disabled?: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Voice state labels and colors
// ---------------------------------------------------------------------------

const STATE_CONFIG: Record<VoiceState, { label: string; color: string; icon: string }> = {
  idle: {
    label: 'Голос',
    color: 'bg-gray-200',
    icon: '🎤',
  },
  listening: {
    label: 'Слушаю...',
    color: 'bg-green-500',
    icon: '👂',
  },
  processing: {
    label: 'Думаю...',
    color: 'bg-amber-500',
    icon: '⏳',
  },
  speaking: {
    label: 'Говорю...',
    color: 'bg-blue-500',
    icon: '🔊',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceButton({
  socket,
  sessionId,
  disabled = false,
  onTranscript,
  onError,
}: VoiceButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isEnabled, setIsEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const voiceCaptureRef = useRef<VoiceCapture | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // -------------------------------------------------------------------------
  // Audio playback for AI responses
  // -------------------------------------------------------------------------

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
          audioData.slice(0) // Clone to avoid detached buffer
        );

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (err) {
        console.error('[VoiceButton] Audio playback error:', err);
      }
    }

    isPlayingRef.current = false;
  }, []);

  // -------------------------------------------------------------------------
  // Voice capture handlers
  // -------------------------------------------------------------------------

  const handleStateChange = useCallback((state: VoiceState) => {
    setVoiceState(state);
  }, []);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        setTranscript('');
      } else {
        setTranscript(text);
      }
      onTranscript?.(text, isFinal);
    },
    [onTranscript]
  );

  const handleAiAudio = useCallback(
    (audioData: ArrayBuffer) => {
      audioQueueRef.current.push(audioData);
      playAudioQueue();
    },
    [playAudioQueue]
  );

  const handleError = useCallback(
    (error: string) => {
      console.error('[VoiceButton] Error:', error);
      if (error.includes('Permission denied') || error.includes('NotAllowedError')) {
        setPermissionDenied(true);
      }
      onError?.(error);
    },
    [onError]
  );

  // -------------------------------------------------------------------------
  // Toggle voice mode
  // -------------------------------------------------------------------------

  const toggleVoice = useCallback(async () => {
    if (!socket || !sessionId) return;

    if (isEnabled) {
      // Disable voice
      voiceCaptureRef.current?.stop();
      voiceCaptureRef.current?.dispose();
      voiceCaptureRef.current = null;
      setIsEnabled(false);
      setVoiceState('idle');
      setTranscript('');
    } else {
      // Enable voice
      try {
        const capture = new VoiceCapture(socket, sessionId, {
          onStateChange: handleStateChange,
          onTranscript: handleTranscript,
          onAiAudio: handleAiAudio,
          onError: handleError,
        });

        await capture.start();
        voiceCaptureRef.current = capture;
        setIsEnabled(true);
        setPermissionDenied(false);
      } catch (err) {
        console.error('[VoiceButton] Failed to start voice:', err);
        if (
          err instanceof Error &&
          (err.message.includes('Permission denied') ||
            err.name === 'NotAllowedError')
        ) {
          setPermissionDenied(true);
        }
      }
    }
  }, [
    socket,
    sessionId,
    isEnabled,
    handleStateChange,
    handleTranscript,
    handleAiAudio,
    handleError,
  ]);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      voiceCaptureRef.current?.dispose();
      audioContextRef.current?.close();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const config = STATE_CONFIG[voiceState];
  const canEnable = !disabled && socket && sessionId;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main toggle button */}
      <button
        onClick={toggleVoice}
        disabled={!canEnable || permissionDenied}
        className={`
          relative flex items-center justify-center
          w-14 h-14 rounded-full
          transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${
            !canEnable || permissionDenied
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : isEnabled
                ? `${config.color} text-white shadow-lg hover:shadow-xl`
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }
        `}
        aria-label={isEnabled ? 'Выключить голос' : 'Включить голос'}
        title={permissionDenied ? 'Нет доступа к микрофону' : config.label}
      >
        {/* Icon */}
        <span className="text-2xl">{permissionDenied ? '🚫' : config.icon}</span>

        {/* Pulse animation when listening */}
        <AnimatePresence>
          {voiceState === 'listening' && (
            <motion.span
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0.5, 0], scale: [1, 1.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-green-400"
            />
          )}
        </AnimatePresence>

        {/* Processing spinner */}
        {voiceState === 'processing' && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-1 rounded-full border-2 border-white border-t-transparent"
          />
        )}
      </button>

      {/* State label */}
      <span
        className={`text-xs font-medium ${
          isEnabled ? 'text-gray-700' : 'text-gray-400'
        }`}
      >
        {permissionDenied ? 'Нет доступа' : config.label}
      </span>

      {/* Live transcript preview */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                       bg-gray-900 text-white text-xs px-3 py-2 rounded-lg
                       max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis
                       shadow-lg"
          >
            {transcript}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact variant for inline use
// ---------------------------------------------------------------------------

export function VoiceButtonCompact({
  socket,
  sessionId,
  disabled = false,
  onTranscript,
  onError,
}: VoiceButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isEnabled, setIsEnabled] = useState(false);
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
          audioData.slice(0)
        );
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch {
        // Ignore playback errors
      }
    }
    isPlayingRef.current = false;
  }, []);

  const toggleVoice = useCallback(async () => {
    if (!socket || !sessionId) return;

    if (isEnabled) {
      voiceCaptureRef.current?.dispose();
      voiceCaptureRef.current = null;
      setIsEnabled(false);
      setVoiceState('idle');
    } else {
      try {
        const capture = new VoiceCapture(socket, sessionId, {
          onStateChange: setVoiceState,
          onTranscript,
          onAiAudio: (data) => {
            audioQueueRef.current.push(data);
            playAudioQueue();
          },
          onError,
        });
        await capture.start();
        voiceCaptureRef.current = capture;
        setIsEnabled(true);
      } catch {
        // Handle error silently
      }
    }
  }, [socket, sessionId, isEnabled, onTranscript, onError, playAudioQueue]);

  useEffect(() => {
    return () => {
      voiceCaptureRef.current?.dispose();
      audioContextRef.current?.close();
    };
  }, []);

  const config = STATE_CONFIG[voiceState];
  const canEnable = !disabled && socket && sessionId;

  return (
    <button
      onClick={toggleVoice}
      disabled={!canEnable}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md
        transition-colors text-sm font-medium
        ${
          !canEnable
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isEnabled
              ? `${config.color} text-white`
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }
      `}
      aria-label={isEnabled ? 'Disable voice' : 'Enable voice'}
    >
      <span>{config.icon}</span>
      <span className="hidden sm:inline">{isEnabled ? config.label : 'Voice'}</span>
    </button>
  );
}
