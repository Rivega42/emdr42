'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const SessionCanvas = dynamic(() => import('./SessionCanvas'), { ssr: false });

export default function SessionPage() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<'preparation' | 'active' | 'integration'>('preparation');
  const [pattern, setPattern] = useState('horizontal');
  const [speed, setSpeed] = useState(1.0);
  const [duration, setDuration] = useState(600);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionPhase === 'active') {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          if (prev >= duration) {
            setSessionPhase('integration');
            setIsSessionActive(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionPhase, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    setShowInstructions(false);
    setSessionPhase('active');
    setIsSessionActive(true);
    setTimeElapsed(0);
  };

  const stopSession = () => {
    setIsSessionActive(false);
    setSessionPhase('integration');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-white/70 hover:text-white transition-colors">
            &larr; Back to Home
          </button>
          <div className="text-white font-semibold">
            Session: {formatTime(timeElapsed)} / {formatTime(duration)}
          </div>
        </div>
      </header>

      <div className="h-screen flex">
        <div className="flex-1 relative">
          {sessionPhase === 'preparation' && showInstructions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-2xl">
                <h2 className="text-3xl font-bold text-white mb-6">Preparation</h2>
                <div className="text-white/80 space-y-4 mb-8">
                  <p>Find a comfortable, quiet space where you won&apos;t be disturbed</p>
                  <p>Sit or lie down in a relaxed position</p>
                  <p>Take a few deep breaths to center yourself</p>
                  <p>Think of a specific issue or memory you&apos;d like to work on</p>
                  <p>Remember: you can pause or stop at any time</p>
                </div>
                <button onClick={startSession} className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-full hover:shadow-xl transition-all">
                  I&apos;m Ready - Start Session
                </button>
              </div>
            </motion.div>
          )}

          {sessionPhase === 'integration' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-2xl">
                <h2 className="text-3xl font-bold text-white mb-6">Integration</h2>
                <div className="text-white/80 space-y-4 mb-8">
                  <p>Great work! You&apos;ve completed your session.</p>
                  <p>Take a moment to notice how you feel in your body, take some deep breaths, and journal any insights or feelings that came up.</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => router.push('/progress')} className="flex-1 py-4 bg-white/20 text-white font-bold rounded-full hover:bg-white/30 transition-all">
                    View Progress
                  </button>
                  <button onClick={() => router.push('/')} className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full hover:shadow-xl transition-all">
                    Finish
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <SessionCanvas pattern={pattern} speed={speed} isActive={isSessionActive && sessionPhase === 'active'} />
        </div>

        {sessionPhase === 'active' && (
          <div className="w-80 bg-black/30 backdrop-blur-md p-6">
            <h3 className="text-white font-bold text-lg mb-6">Session Controls</h3>
            <div className="space-y-6">
              <div>
                <label className="text-white/70 text-sm block mb-2">Pattern</label>
                <select value={pattern} onChange={(e) => setPattern(e.target.value)} className="w-full bg-white/10 text-white rounded-lg px-3 py-2">
                  <option value="horizontal">Horizontal</option>
                  <option value="infinity">Infinity</option>
                  <option value="butterfly">Butterfly</option>
                  <option value="circular">Circular</option>
                </select>
              </div>
              <div>
                <label className="text-white/70 text-sm block mb-2">Speed: {speed.toFixed(1)} Hz</label>
                <input type="range" min="0.3" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full" />
              </div>
              <button
                onClick={isSessionActive ? stopSession : startSession}
                className={`w-full py-3 rounded-full font-bold transition-all ${isSessionActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
              >
                {isSessionActive ? 'End Session' : 'Resume Session'}
              </button>
              <div className="pt-6 border-t border-white/20">
                <h4 className="text-white font-semibold mb-3">Quick Tips</h4>
                <ul className="text-white/60 text-sm space-y-2">
                  <li>Follow the moving object with your eyes</li>
                  <li>Keep your head still</li>
                  <li>Breathe naturally</li>
                  <li>It&apos;s okay to blink</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
