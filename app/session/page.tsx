'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { AudioBlsController } from '@/lib/audio-bls';
import type { Socket } from 'socket.io-client';

const SessionCanvas = dynamic(() => import('./SessionCanvas'), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmdrPhase =
  | 'history'
  | 'preparation'
  | 'assessment'
  | 'desensitization'
  | 'installation'
  | 'body_scan'
  | 'closure'
  | 'reevaluation';

interface ChatMessage {
  id: string;
  role: 'ai' | 'patient';
  text: string;
  streaming?: boolean;
}

interface BlsConfig {
  pattern: string;
  speed: number;
  setLength?: number;
  paused?: boolean;
}

interface SafetyAlertData {
  riskLevel: string;
  events: { type: string; severity: string; actionTaken: string }[];
}

interface InterventionData {
  type: string;
  instructions: string;
  priority: string;
  riskLevel: string;
}

interface SessionEndedData {
  sessionId: string;
  elapsedSeconds: number;
  blsSetsCompleted: number;
  finalSuds: number | null;
  finalVoc: number | null;
  phasesCompleted: number;
  safetyEventsCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHASE_META: Record<EmdrPhase, { label: string; group: 'pre' | 'bls' | 'post' }> = {
  history:          { label: 'History',          group: 'pre' },
  preparation:      { label: 'Preparation',      group: 'pre' },
  assessment:       { label: 'Assessment',        group: 'pre' },
  desensitization:  { label: 'Desensitization',   group: 'bls' },
  installation:     { label: 'Installation',       group: 'bls' },
  body_scan:        { label: 'Body Scan',          group: 'bls' },
  closure:          { label: 'Closure',            group: 'post' },
  reevaluation:     { label: 'Reevaluation',       group: 'post' },
};

const PHASE_ORDER: EmdrPhase[] = [
  'history', 'preparation', 'assessment',
  'desensitization', 'installation', 'body_scan',
  'closure', 'reevaluation',
];

const BLS_PHASES: EmdrPhase[] = ['desensitization', 'installation', 'body_scan'];

const PATTERNS = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'infinity',   label: 'Infinity' },
  { value: 'diagonal',   label: 'Diagonal' },
  { value: 'circular',   label: 'Circular' },
  { value: 'butterfly',  label: 'Butterfly' },
  { value: 'spiral',     label: 'Spiral' },
  { value: 'wave',       label: 'Wave' },
  { value: 'lissajous',  label: 'Lissajous' },
  { value: 'pendulum',   label: 'Pendulum' },
  { value: 'random_smooth', label: 'Random Smooth' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionPage() {
  const router = useRouter();

  // Connection state
  const [connected, setConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Phase
  const [phase, setPhase] = useState<EmdrPhase>('history');

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef('');

  // BLS
  const [blsConfig, setBlsConfig] = useState<BlsConfig>({ pattern: 'horizontal', speed: 1.0, paused: true });

  // SUDS / VOC
  const [suds, setSuds] = useState(5);
  const [voc, setVoc] = useState(4);

  // Emotions
  const [stress, setStress] = useState(0);
  const [engagement, setEngagement] = useState(0);
  const [emotionLabel, setEmotionLabel] = useState('--');

  // Safety
  const [safetyAlert, setSafetyAlert] = useState<SafetyAlertData | null>(null);
  const [intervention, setIntervention] = useState<InterventionData | null>(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Session ended summary
  const [sessionSummary, setSessionSummary] = useState<SessionEndedData | null>(null);

  // Мобильный переключатель чат/канвас
  const [mobileTab, setMobileTab] = useState<'chat' | 'canvas'>('chat');

  // Audio BLS
  const audioRef = useRef<AudioBlsController | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [blsColor, setBlsColor] = useState('#4CAF50');

  // Socket ref for stable access inside callbacks
  const socketRef = useRef<Socket | null>(null);

  // Refs для актуальных значений внутри сокет-обработчиков
  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;
  const blsSpeedRef = useRef(blsConfig.speed);
  blsSpeedRef.current = blsConfig.speed;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const updateLastAiMessage = useCallback((text: string, done: boolean) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'ai' && last.streaming) {
        return [...prev.slice(0, -1), { ...last, text, streaming: !done }];
      }
      return prev;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Timer
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (sessionId && !isPaused && !sessionSummary) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionId, isPaused, sessionSummary]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -------------------------------------------------------------------------
  // Mock emotion sender (will be replaced by MorphCast)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!sessionId || !socketRef.current) return;
    const interval = setInterval(() => {
      const mockStress = 0.3 + Math.random() * 0.4;
      const mockEngagement = 0.5 + Math.random() * 0.3;
      setStress(mockStress);
      setEngagement(mockEngagement);
      setEmotionLabel(mockStress > 0.6 ? 'Elevated' : mockStress > 0.4 ? 'Moderate' : 'Calm');

      socketRef.current?.emit('session:emotion', {
        sessionId,
        emotion: {
          timestamp: Date.now(),
          stress: mockStress,
          engagement: mockEngagement,
          positivity: 0.5,
          arousal: mockStress,
          valence: 1 - mockStress,
          joy: 0.2,
          sadness: 0.1,
          anger: 0.05,
          fear: mockStress * 0.5,
          surprise: 0.05,
          disgust: 0.02,
          confidence: 0.7,
        },
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // -------------------------------------------------------------------------
  // Socket connection & events
  // -------------------------------------------------------------------------

  const connectAndStart = useCallback(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('connect', async () => {
      setConnected(true);
      const id = crypto.randomUUID();
      setSessionId(id);
      socket.emit('session:start', { sessionId: id });

      // Initialize audio on first user interaction
      if (!audioRef.current) {
        audioRef.current = new AudioBlsController();
        await audioRef.current.initialize();
      }
    });

    socket.on('connect_error', () => {
      setConnected(false);
      setOfflineMode(true);
    });

    // AI response streaming
    socket.on('session:ai_response', (data: { type: string; text: string }) => {
      if (data.type === 'chunk') {
        streamBufferRef.current += data.text;
        // Create a streaming message on first chunk
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'ai' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text: streamBufferRef.current }];
          }
          return [...prev, { id: crypto.randomUUID(), role: 'ai', text: streamBufferRef.current, streaming: true }];
        });
      } else if (data.type === 'complete') {
        streamBufferRef.current = '';
        updateLastAiMessage(data.text, true);
      } else if (data.type === 'error') {
        streamBufferRef.current = '';
        addMessage({ id: crypto.randomUUID(), role: 'ai', text: data.text });
      }
    });

    // Phase change
    socket.on('session:phase_changed', (data: { phase: EmdrPhase; reason: string }) => {
      setPhase(data.phase);
      if (BLS_PHASES.includes(data.phase)) {
        setBlsConfig(prev => ({ ...prev, paused: false }));
        if (audioEnabledRef.current && audioRef.current) {
          audioRef.current.startBilateral(blsSpeedRef.current);
        }
      } else {
        audioRef.current?.stopBilateral();
      }
    });

    // BLS config update
    socket.on('session:bls_config', (data: BlsConfig) => {
      setBlsConfig(data);
      if (audioRef.current) {
        if (data.paused) {
          audioRef.current.stopBilateral();
        } else if (audioEnabledRef.current) {
          audioRef.current.updateSpeed(data.speed);
          audioRef.current.startBilateral(data.speed);
        }
      }
    });

    // Safety alert
    socket.on('session:safety_alert', (data: SafetyAlertData) => {
      setSafetyAlert(data);
    });

    // Intervention
    socket.on('session:intervention', (data: InterventionData) => {
      setIntervention(data);
    });

    // Session ended
    socket.on('session:session_ended', (data: SessionEndedData) => {
      setSessionSummary(data);
    });

    // Error
    socket.on('session:error', (data: { message: string }) => {
      addMessage({ id: crypto.randomUUID(), role: 'ai', text: `Error: ${data.message}` });
    });

    socket.connect();
  }, [addMessage, updateLastAiMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId && socketRef.current) {
        socketRef.current.emit('session:end', { sessionId });
      }
      disconnectSocket();
      socketRef.current = null;
    };
  }, [sessionId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Send handlers
  // -------------------------------------------------------------------------

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !sessionId || !socketRef.current) return;
    addMessage({ id: crypto.randomUUID(), role: 'patient', text });
    socketRef.current.emit('session:message', { sessionId, text });
    setInputText('');
  };

  const sendSuds = () => {
    if (!sessionId || !socketRef.current) return;
    socketRef.current.emit('session:suds', { sessionId, value: suds, context: `phase:${phase}` });
    addMessage({ id: crypto.randomUUID(), role: 'patient', text: `SUDS rating: ${suds}/10` });
  };

  const sendVoc = () => {
    if (!sessionId || !socketRef.current) return;
    socketRef.current.emit('session:voc', { sessionId, value: voc, context: `phase:${phase}` });
    addMessage({ id: crypto.randomUUID(), role: 'patient', text: `VOC rating: ${voc}/7` });
  };

  const handlePauseResume = () => {
    if (!sessionId || !socketRef.current) return;
    if (isPaused) {
      socketRef.current.emit('session:resume', { sessionId });
      setIsPaused(false);
      if (audioEnabled && isBlsPhase) audioRef.current?.startBilateral(blsConfig.speed);
    } else {
      socketRef.current.emit('session:pause', { sessionId });
      setIsPaused(true);
      audioRef.current?.stopBilateral();
    }
  };

  const handleStop = () => {
    if (!sessionId || !socketRef.current) return;
    socketRef.current.emit('session:stop_signal', { sessionId });
    audioRef.current?.stopBilateral();
  };

  const handleEnd = () => {
    if (!sessionId || !socketRef.current) return;
    socketRef.current.emit('session:end', { sessionId });
    audioRef.current?.stopBilateral();
  };

  // -------------------------------------------------------------------------
  // Offline mode handlers
  // -------------------------------------------------------------------------

  const startOffline = () => {
    setOfflineMode(true);
    setBlsConfig({ pattern: 'horizontal', speed: 1.0, paused: false });
    setSessionId('offline');
  };

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const isBlsPhase = BLS_PHASES.includes(phase);
  const blsActive = isBlsPhase && !blsConfig.paused && !!sessionId;
  const phaseIndex = PHASE_ORDER.indexOf(phase);

  // -------------------------------------------------------------------------
  // Render: Landing (no session started)
  // -------------------------------------------------------------------------

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg w-full p-8 space-y-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900">EMDR Session</h1>
          <p className="text-gray-500">Start an AI-guided EMDR therapy session or use standalone BLS mode.</p>
          <div className="space-y-3">
            <button
              onClick={connectAndStart}
              className="w-full py-4 rounded-md bg-gray-900 hover:bg-gray-800 text-white font-semibold transition-colors"
            >
              Start AI-Guided Session
            </button>
            <button
              onClick={startOffline}
              className="w-full py-4 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
            >
              BLS Only (Offline)
            </button>
          </div>
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
            &larr; Back to Home
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Offline BLS-only mode
  // -------------------------------------------------------------------------

  if (offlineMode) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Top bar -- light Cal.com style */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
          <button onClick={() => { setSessionId(null); setOfflineMode(false); }} className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            &larr; Exit
          </button>
          <span className="text-gray-500 text-sm">BLS Only Mode (Offline)</span>
          <span className="text-gray-500 text-sm">{formatTime(elapsed)}</span>
        </header>

        {/* Canvas -- stays dark for therapy */}
        <div className="flex-1 relative bg-gray-950">
          <SessionCanvas
            pattern={blsConfig.pattern}
            speed={blsConfig.speed}
            isActive={!blsConfig.paused}
            color={blsColor}
            trailEnabled={true}
            particlesEnabled={true}
            emotionArousal={stress}
          />
        </div>

        {/* Панель управления офлайн-режимом */}
        <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
          {/* Основные контролы — первый ряд */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-center">
            <select
              value={blsConfig.pattern}
              onChange={e => setBlsConfig(c => ({ ...c, pattern: e.target.value }))}
              className="bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-gray-900"
              aria-label="Паттерн BLS"
            >
              {PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button
              onClick={() => setBlsConfig(c => ({ ...c, paused: !c.paused }))}
              className={`px-6 py-2.5 rounded-md font-semibold text-sm transition-colors min-w-[80px] ${blsConfig.paused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'}`}
            >
              {blsConfig.paused ? 'Start' : 'Pause'}
            </button>
          </div>
          {/* Дополнительные контролы — второй ряд */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-center mt-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Speed</span>
              <input
                type="range" min="0.3" max="2.0" step="0.1"
                value={blsConfig.speed}
                onChange={e => setBlsConfig(c => ({ ...c, speed: parseFloat(e.target.value) }))}
                className="w-20 sm:w-24"
                aria-label="Скорость BLS"
              />
              <span className="text-gray-500 text-sm w-10">{blsConfig.speed.toFixed(1)}x</span>
            </div>
            <label className="flex items-center gap-2 text-gray-500 text-sm">
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={async (e) => {
                  setAudioEnabled(e.target.checked);
                  if (e.target.checked) {
                    if (!audioRef.current) {
                      audioRef.current = new AudioBlsController();
                      await audioRef.current.initialize();
                    }
                    if (!blsConfig.paused) audioRef.current.startBilateral(blsConfig.speed);
                  } else {
                    audioRef.current?.stopBilateral();
                  }
                }}
                className="w-4 h-4"
              />
              Audio
            </label>
            <div className="flex items-center gap-2">
              <label className="text-gray-500 text-sm">Color</label>
              <input type="color" value={blsColor} onChange={(e) => setBlsColor(e.target.value)} className="w-10 h-8 rounded-md cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Connected AI session
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ---- Панель эмоций ---- */}
      <header className="flex items-center gap-3 sm:gap-6 px-3 sm:px-6 py-2 bg-white border-b border-gray-200 text-sm overflow-x-auto">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-900 transition-colors shrink-0 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
          &larr;
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-400 hidden sm:inline">Stress</span>
          <span className="text-gray-400 sm:hidden text-xs">S</span>
          <div className="w-16 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${stress * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-400 hidden sm:inline">Engagement</span>
          <span className="text-gray-400 sm:hidden text-xs">E</span>
          <div className="w-16 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${engagement * 100}%` }} />
          </div>
        </div>
        <span className="text-gray-500 shrink-0">{emotionLabel}</span>
        <span className="text-gray-400 ml-auto shrink-0">{formatTime(elapsed)}</span>
      </header>

      {/* ---- Phase stepper -- light Cal.com style ---- */}
      <div className="flex items-center px-6 py-2 bg-white border-b border-gray-200 gap-1 overflow-x-auto">
        {PHASE_ORDER.map((p, i) => {
          const isCurrent = p === phase;
          const isPast = i < phaseIndex;
          return (
            <React.Fragment key={p}>
              {i > 0 && <div className={`h-px flex-1 min-w-2 ${isPast ? 'bg-gray-900' : 'bg-gray-200'}`} />}
              <div
                className={`px-2 py-1 rounded text-xs whitespace-nowrap font-medium transition-colors ${
                  isCurrent ? 'bg-gray-900 text-white' : isPast ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {PHASE_META[p].label}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ---- Мобильные табы (чат / канвас) ---- */}
      <div className="md:hidden flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mobileTab === 'chat' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'
          }`}
        >
          Чат
        </button>
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mobileTab === 'canvas' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'
          }`}
        >
          BLS / Управление
        </button>
      </div>

      {/* ---- Основной контент ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* -- Чат -- */}
        <div className={`flex-col w-full md:w-1/2 lg:w-2/5 border-r border-gray-200 bg-white ${
          mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-400 text-center mt-10">
                {connected ? 'Connecting to AI therapist...' : 'Waiting for connection...'}
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'ai'
                      ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
                      : 'bg-gray-900 text-white rounded-tr-sm'
                  }`}
                >
                  {msg.text}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-gray-400 animate-pulse rounded-sm align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
                aria-label="Message input"
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white rounded-md text-sm font-semibold transition-colors"
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* -- Канвас + Управление -- */}
        <div className={`flex-1 flex-col ${
          mobileTab === 'canvas' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Canvas area -- stays dark for therapy */}
          <div className="flex-1 relative bg-gray-950">
            {isBlsPhase ? (
              <SessionCanvas
                pattern={blsConfig.pattern}
                speed={blsConfig.speed}
                isActive={blsActive}
                color={blsColor}
                trailEnabled={true}
                particlesEnabled={true}
                emotionArousal={stress}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/20 text-lg">BLS visualization activates during desensitization phases</p>
              </div>
            )}
          </div>

          {/* Панель управления */}
          <div className="bg-white border-t border-gray-200 p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* SUDS / VOC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Rate your distress (SUDS 0-10)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="10" step="1" value={suds}
                    onChange={e => setSuds(parseInt(e.target.value))}
                    className="flex-1"
                    aria-label="SUDS rating"
                  />
                  <span className="text-gray-900 font-mono w-6 text-center">{suds}</span>
                  <button onClick={sendSuds} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md transition-colors">
                    Submit
                  </button>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">How true does this feel? (VOC 1-7)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="1" max="7" step="1" value={voc}
                    onChange={e => setVoc(parseInt(e.target.value))}
                    className="flex-1"
                    aria-label="VOC rating"
                  />
                  <span className="text-gray-900 font-mono w-6 text-center">{voc}</span>
                  <button onClick={sendVoc} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md transition-colors">
                    Submit
                  </button>
                </div>
              </div>
            </div>

            {/* BLS controls row (only during BLS phases) */}
            {isBlsPhase && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-xs">Pattern</label>
                  <select
                    value={blsConfig.pattern}
                    onChange={e => setBlsConfig(c => ({ ...c, pattern: e.target.value }))}
                    className="bg-white border border-gray-300 text-gray-900 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-gray-900"
                    aria-label="BLS pattern"
                  >
                    {PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-xs">Speed</label>
                  <input
                    type="range" min="0.3" max="2.0" step="0.1"
                    value={blsConfig.speed}
                    onChange={e => setBlsConfig(c => ({ ...c, speed: parseFloat(e.target.value) }))}
                    className="w-20"
                    aria-label="BLS speed"
                  />
                  <span className="text-gray-500 text-xs w-8">{blsConfig.speed.toFixed(1)}x</span>
                </div>
                <label className="flex items-center gap-2 text-gray-500 text-xs">
                  <input
                    type="checkbox"
                    checked={audioEnabled}
                    onChange={(e) => {
                      setAudioEnabled(e.target.checked);
                      if (e.target.checked) audioRef.current?.startBilateral(blsConfig.speed);
                      else audioRef.current?.stopBilateral();
                    }}
                    className="w-3.5 h-3.5"
                  />
                  Bilateral Audio
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-xs">Color</label>
                  <input type="color" value={blsColor} onChange={(e) => setBlsColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
                </div>
              </div>
            )}

            {/* Кнопки управления */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handlePauseResume}
                className={`px-4 sm:px-5 py-3 sm:py-2 rounded-md text-sm font-semibold transition-colors ${
                  isPaused
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-white'
                }`}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleStop}
                className="px-4 sm:px-5 py-3 sm:py-2 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Stop
              </button>
              <button
                onClick={handleEnd}
                className="px-4 sm:px-5 py-3 sm:py-2 rounded-md text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ml-auto"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Safety alert overlay ---- */}
      <AnimatePresence>
        {safetyAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <div className="bg-white border border-red-200 rounded-lg p-8 max-w-md mx-4 shadow-lg">
              <h2 className="text-xl font-bold text-red-600 mb-3">Safety Alert</h2>
              <p className="text-red-500 text-sm mb-2">Risk level: {safetyAlert.riskLevel}</p>
              {safetyAlert.events.map((evt, i) => (
                <p key={i} className="text-gray-600 text-sm">{evt.type}: {evt.actionTaken}</p>
              ))}
              <button
                onClick={() => setSafetyAlert(null)}
                className="mt-6 w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Intervention overlay ---- */}
      <AnimatePresence>
        {intervention && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <div className="bg-white border border-amber-200 rounded-lg p-8 max-w-md mx-4 shadow-lg">
              <h2 className="text-xl font-bold text-amber-700 mb-3">Intervention</h2>
              <p className="text-gray-700 text-sm mb-4 whitespace-pre-line">{intervention.instructions}</p>
              <button
                onClick={() => setIntervention(null)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-semibold transition-colors"
              >
                I understand
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Session ended overlay ---- */}
      <AnimatePresence>
        {sessionSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md mx-4 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Complete</h2>
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <p>Duration: {formatTime(sessionSummary.elapsedSeconds)}</p>
                <p>BLS sets completed: {sessionSummary.blsSetsCompleted}</p>
                <p>Phases completed: {sessionSummary.phasesCompleted}</p>
                {sessionSummary.finalSuds !== null && <p>Final SUDS: {sessionSummary.finalSuds}/10</p>}
                {sessionSummary.finalVoc !== null && <p>Final VOC: {sessionSummary.finalVoc}/7</p>}
                {sessionSummary.safetyEventsCount > 0 && (
                  <p className="text-amber-600">Safety events: {sessionSummary.safetyEventsCount}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/progress')}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold transition-colors"
                >
                  View Progress
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
