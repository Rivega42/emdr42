'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { VoiceCapture, type VoiceState } from '@/lib/voice-capture';

interface VoiceButtonProps {
  socket: Socket | null;
  /** Колбэк при получении финальной транскрипции */
  onTranscript?: (text: string) => void;
  /** Колбэк при получении текстового ответа AI */
  onAiText?: (text: string) => void;
  disabled?: boolean;
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Голос',
  listening: 'Слушаю...',
  processing: 'Думаю...',
  speaking: 'Говорю...',
};

const STATE_COLORS: Record<VoiceState, string> = {
  idle: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  listening: 'bg-red-500 hover:bg-red-400 text-white',
  processing: 'bg-amber-500 text-white',
  speaking: 'bg-green-500 text-white',
};

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  socket,
  onTranscript,
  onAiText,
  disabled = false,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [partialText, setPartialText] = useState('');
  const voiceCaptureRef = useRef<VoiceCapture | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Воспроизведение аудио-ответа от TTS
  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (err) {
      console.error('[VoiceButton] Ошибка воспроизведения аудио:', err);
    }
  }, []);

  // Подписка на AI текстовый ответ
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { text: string }) => onAiText?.(data.text);
    socket.on('voice:ai_text', handler);
    return () => { socket.off('voice:ai_text', handler); };
  }, [socket, onAiText]);

  const toggleVoice = useCallback(async () => {
    if (!socket) return;

    if (voiceCaptureRef.current?.isRecording) {
      // Остановить
      voiceCaptureRef.current.stop();
      setVoiceState('idle');
      setPartialText('');
      return;
    }

    // Запустить
    const vc = new VoiceCapture(socket);

    vc.onTranscript((text, isFinal) => {
      if (isFinal) {
        setPartialText('');
        onTranscript?.(text);
      } else {
        setPartialText(text);
      }
    });

    vc.onStateChange((state) => setVoiceState(state));
    vc.onAudioResponse((data) => playAudio(data));

    voiceCaptureRef.current = vc;

    try {
      await vc.start();
    } catch (err) {
      console.error('[VoiceButton] Ошибка доступа к микрофону:', err);
      setVoiceState('idle');
    }
  }, [socket, onTranscript, playAudio]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      voiceCaptureRef.current?.dispose();
      audioContextRef.current?.close();
    };
  }, []);

  const isActive = voiceState !== 'idle';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleVoice}
        disabled={disabled || !socket}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors min-h-[44px] ${
          STATE_COLORS[voiceState]
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label={isActive ? 'Остановить голосовой ввод' : 'Включить голосовой ввод'}
      >
        {/* Иконка микрофона */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isActive ? (
            // Анимированные волны
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z">
                <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
              </path>
            </>
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            </>
          )}
        </svg>
        {STATE_LABELS[voiceState]}
      </button>

      {/* Индикатор состояния */}
      {isActive && (
        <div className="flex items-center gap-1.5">
          {voiceState === 'listening' && (
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 12}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}
          {voiceState === 'processing' && (
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          )}
          {voiceState === 'speaking' && (
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-green-500 rounded-full animate-pulse"
                  style={{
                    height: `${6 + Math.random() * 10}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Частичная транскрипция */}
      {partialText && (
        <span className="text-xs text-gray-400 italic max-w-[200px] truncate">
          {partialText}
        </span>
      )}
    </div>
  );
};
