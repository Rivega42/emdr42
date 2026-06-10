'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Socket } from 'socket.io-client';
import type { VoiceState } from '@/lib/voice-capture';
import { useVoice } from '@/lib/hooks/useVoice';

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
  idle: { label: 'Голос', color: 'bg-gray-200', icon: '🎤' },
  listening: { label: 'Слушаю...', color: 'bg-green-500', icon: '👂' },
  processing: { label: 'Думаю...', color: 'bg-amber-500', icon: '⏳' },
  speaking: { label: 'Говорю...', color: 'bg-blue-500', icon: '🔊' },
};

// ---------------------------------------------------------------------------
// Main button
// ---------------------------------------------------------------------------

export default function VoiceButton({
  socket,
  sessionId,
  disabled = false,
  onTranscript,
  onError,
}: VoiceButtonProps) {
  // Вся pipeline-логика (capture lifecycle, audio queue с timeout-страховкой
  // #234, error/permission handling) в hook — раньше дублировалась с Compact.
  const { voiceState, isEnabled, transcript, permissionDenied, toggle } = useVoice({
    socket,
    sessionId,
    onTranscript,
    onError,
  });

  const config = STATE_CONFIG[voiceState];
  const canEnable = !disabled && socket && sessionId;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main toggle button */}
      <button
        onClick={toggle}
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
        <span className="text-2xl">{permissionDenied ? '🚫' : config.icon}</span>

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

        {voiceState === 'processing' && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-1 rounded-full border-2 border-white border-t-transparent"
          />
        )}
      </button>

      <span className={`text-xs font-medium ${isEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
        {permissionDenied ? 'Нет доступа' : config.label}
      </span>

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
  const { voiceState, isEnabled, permissionDenied, toggle } = useVoice({
    socket,
    sessionId,
    onTranscript,
    onError,
  });
  const config = STATE_CONFIG[voiceState];
  const canEnable = !disabled && socket && sessionId;

  return (
    <button
      onClick={toggle}
      disabled={!canEnable || permissionDenied}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md
        transition-colors text-sm font-medium
        ${
          !canEnable || permissionDenied
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isEnabled
              ? `${config.color} text-white`
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }
      `}
      aria-label={isEnabled ? 'Disable voice' : 'Enable voice'}
    >
      <span>{permissionDenied ? '🚫' : config.icon}</span>
      <span className="hidden sm:inline">{isEnabled ? config.label : 'Voice'}</span>
    </button>
  );
}
