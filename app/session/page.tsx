'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { getSocket, disconnectSocket } from '@/lib/socket';
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
  { value: 'butterfly',  label: 'Butterfly' },
  { value: 'circular',   label: 'Circular' },
  { value: 'spiral',     label: 'Spiral' },
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

  // Socket ref for stable access inside callbacks
  const socketRef = useRef<Socket | null>(null);

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

    socket.on('connect', () => {
      setConnected(true);
      const id = crypto.randomUUID();
      setSessionId(id);
      socket.emit('session:start', { sessionId: id });
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
      }
    });

    // BLS config update
    socket.on('session:bls_config', (data: BlsConfig) => {
      setBlsConfig(data);
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
    } else {
      socketRef.current.emit('session:pause', { sessionId });
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (!sessionId || !socketRef.current) return;
    socketRef.current.emit('session:stop_signal', { sessionId });
  };

  const handleEnd = () => {
    if (!sessionId || !socketRef.current) return;
    socketRef.current.emit('session:end', { sessionId });
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
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex items-center justify-center">
        <div className="max-w-lg w-full p-8 space-y-6 text-center">
          <h1 className="text-4xl font-bold text-white">EMDR Session</h1>
          <p className="text-white/60">Start an AI-guided EMDR therapy session or use standalone BLS mode.</p>
          <div className="space-y-3">
            <button
              onClick={connectAndStart}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
            >
              Start AI-Guided Session
            </button>
            <button
              onClick={startOffline}
              className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 font-semibold transition-colors"
            >
              BLS Only (Offline)
            </button>
          </div>
          <button onClick={() => router.push('/')} className="text-white/40 hover:text-white/70 text-sm transition-colors">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-black/30">
          <button onClick={() => { setSessionId(null); setOfflineMode(false); }} className="text-white/60 hover:text-white text-sm transition-colors">
            &larr; Exit
          </button>
          <span className="text-white/50 text-sm">BLS Only Mode (Offline)</span>
          <span className="text-white/50 text-sm">{formatTime(elapsed)}</span>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative">
          <SessionCanvas pattern={blsConfig.pattern} speed={blsConfig.speed} isActive={!blsConfig.paused} />
        </div>

        {/* Controls */}
        <div className="bg-black/40 p-4 flex flex-wrap items-center gap-4 justify-center">
          <select
            value={blsConfig.pattern}
            onChange={e => setBlsConfig(c => ({ ...c, pattern: e.target.value }))}
            className="bg-white/10 text-white rounded-lg px-3 py-2 text-sm"
            aria-label="BLS pattern"
          >
            {PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Speed</span>
            <input
              type="range" min="0.3" max="2.0" step="0.1"
              value={blsConfig.speed}
              onChange={e => setBlsConfig(c => ({ ...c, speed: parseFloat(e.target.value) }))}
              className="w-24"
              aria-label="BLS speed"
            />
            <span className="text-white/60 text-sm w-10">{blsConfig.speed.toFixed(1)}x</span>
          </div>
          <button
            onClick={() => setBlsConfig(c => ({ ...c, paused: !c.paused }))}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${blsConfig.paused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white'}`}
          >
            {blsConfig.paused ? 'Start' : 'Pause'}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Connected AI session
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex flex-col">
      {/* ---- Emotion bar ---- */}
      <header className="flex items-center gap-6 px-6 py-2 bg-black/40 border-b border-white/10 text-sm">
        <button onClick={() => router.push('/')} className="text-white/50 hover:text-white transition-colors">
          &larr;
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-white/50">Stress</span>
          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${stress * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-white/50">Engagement</span>
          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${engagement * 100}%` }} />
          </div>
        </div>
        <span className="text-white/60">{emotionLabel}</span>
        <span className="text-white/40 ml-auto">{formatTime(elapsed)}</span>
      </header>

      {/* ---- Phase stepper ---- */}
      <div className="flex items-center px-6 py-2 bg-black/20 gap-1 overflow-x-auto">
        {PHASE_ORDER.map((p, i) => {
          const isCurrent = p === phase;
          const isPast = i < phaseIndex;
          return (
            <React.Fragment key={p}>
              {i > 0 && <div className={`h-px flex-1 min-w-2 ${isPast ? 'bg-indigo-400' : 'bg-white/10'}`} />}
              <div
                className={`px-2 py-1 rounded text-xs whitespace-nowrap font-medium transition-colors ${
                  isCurrent ? 'bg-indigo-600 text-white' : isPast ? 'text-indigo-300' : 'text-white/30'
                }`}
              >
                {PHASE_META[p].label}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ---- Main content ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* -- Left: Chat -- */}
        <div className="flex flex-col w-full md:w-1/2 lg:w-2/5 border-r border-white/10">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-white/30 text-center mt-10">
                {connected ? 'Connecting to AI therapist...' : 'Waiting for connection...'}
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'ai'
                      ? 'bg-indigo-900/60 text-indigo-100 rounded-tl-sm'
                      : 'bg-purple-800/60 text-purple-100 rounded-tr-sm'
                  }`}
                >
                  {msg.text}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-300 animate-pulse rounded-sm align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-black/30 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Message input"
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* -- Right: Canvas + Controls -- */}
        <div className="hidden md:flex flex-1 flex-col">
          {/* Canvas area */}
          <div className="flex-1 relative">
            {isBlsPhase ? (
              <SessionCanvas pattern={blsConfig.pattern} speed={blsConfig.speed} isActive={blsActive} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/20 text-lg">BLS visualization activates during desensitization phases</p>
              </div>
            )}
          </div>

          {/* Controls panel */}
          <div className="bg-black/40 border-t border-white/10 p-4 space-y-4">
            {/* SUDS / VOC row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-xs block mb-1">Rate your distress (SUDS 0-10)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="10" step="1" value={suds}
                    onChange={e => setSuds(parseInt(e.target.value))}
                    className="flex-1"
                    aria-label="SUDS rating"
                  />
                  <span className="text-white font-mono w-6 text-center">{suds}</span>
                  <button onClick={sendSuds} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors">
                    Submit
                  </button>
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">How true does this feel? (VOC 1-7)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="1" max="7" step="1" value={voc}
                    onChange={e => setVoc(parseInt(e.target.value))}
                    className="flex-1"
                    aria-label="VOC rating"
                  />
                  <span className="text-white font-mono w-6 text-center">{voc}</span>
                  <button onClick={sendVoc} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors">
                    Submit
                  </button>
                </div>
              </div>
            </div>

            {/* BLS controls row (only during BLS phases) */}
            {isBlsPhase && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-white/50 text-xs">Pattern</label>
                  <select
                    value={blsConfig.pattern}
                    onChange={e => setBlsConfig(c => ({ ...c, pattern: e.target.value }))}
                    className="bg-white/10 text-white rounded-lg px-2 py-1 text-xs"
                    aria-label="BLS pattern"
                  >
                    {PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-white/50 text-xs">Speed</label>
                  <input
                    type="range" min="0.3" max="2.0" step="0.1"
                    value={blsConfig.speed}
                    onChange={e => setBlsConfig(c => ({ ...c, speed: parseFloat(e.target.value) }))}
                    className="w-20"
                    aria-label="BLS speed"
                  />
                  <span className="text-white/60 text-xs w-8">{blsConfig.speed.toFixed(1)}x</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePauseResume}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isPaused
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleStop}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600 text-white transition-colors"
              >
                Stop
              </button>
              <button
                onClick={handleEnd}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors ml-auto"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-red-950 border border-red-500/50 rounded-2xl p-8 max-w-md mx-4">
              <h2 className="text-xl font-bold text-red-300 mb-3">Safety Alert</h2>
              <p className="text-red-200/80 text-sm mb-2">Risk level: {safetyAlert.riskLevel}</p>
              {safetyAlert.events.map((evt, i) => (
                <p key={i} className="text-red-200/60 text-sm">{evt.type}: {evt.actionTaken}</p>
              ))}
              <button
                onClick={() => setSafetyAlert(null)}
                className="mt-6 w-full py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-amber-950 border border-amber-500/50 rounded-2xl p-8 max-w-md mx-4">
              <h2 className="text-xl font-bold text-amber-300 mb-3">Intervention</h2>
              <p className="text-amber-200/80 text-sm mb-4 whitespace-pre-line">{intervention.instructions}</p>
              <button
                onClick={() => setIntervention(null)}
                className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl p-8 max-w-md mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">Session Complete</h2>
              <div className="space-y-2 text-sm text-white/70 mb-6">
                <p>Duration: {formatTime(sessionSummary.elapsedSeconds)}</p>
                <p>BLS sets completed: {sessionSummary.blsSetsCompleted}</p>
                <p>Phases completed: {sessionSummary.phasesCompleted}</p>
                {sessionSummary.finalSuds !== null && <p>Final SUDS: {sessionSummary.finalSuds}/10</p>}
                {sessionSummary.finalVoc !== null && <p>Final VOC: {sessionSummary.finalVoc}/7</p>}
                {sessionSummary.safetyEventsCount > 0 && (
                  <p className="text-amber-400">Safety events: {sessionSummary.safetyEventsCount}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/progress')}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors"
                >
                  View Progress
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
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
