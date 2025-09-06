import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const SessionPage: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<'preparation' | 'active' | 'integration'>('preparation');
  const [pattern, setPattern] = useState('horizontal');
  const [speed, setSpeed] = useState(1.0);
  const [duration, setDuration] = useState(600); // 10 minutes default
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const navigate = useNavigate();

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
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="text-white/70 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
          <div className="text-white font-semibold">
            Session: {formatTime(timeElapsed)} / {formatTime(duration)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="h-screen flex">
        {/* Visualization Area */}
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
                  <p>• Find a comfortable, quiet space where you won't be disturbed</p>
                  <p>• Sit or lie down in a relaxed position</p>
                  <p>• Take a few deep breaths to center yourself</p>
                  <p>• Think of a specific issue or memory you'd like to work on</p>
                  <p>• Remember: you can pause or stop at any time</p>
                </div>
                <button
                  onClick={startSession}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-full hover:shadow-xl transition-all"
                >
                  I'm Ready - Start Session
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
                  <p>Great work! You've completed your session.</p>
                  <p>Take a moment to:</p>
                  <p>• Notice how you feel in your body</p>
                  <p>• Take some deep breaths</p>
                  <p>• Journal any insights or feelings that came up</p>
                  <p>• Be gentle with yourself for the rest of the day</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate('/progress')}
                    className="flex-1 py-4 bg-white/20 text-white font-bold rounded-full hover:bg-white/30 transition-all"
                  >
                    View Progress
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full hover:shadow-xl transition-all"
                  >
                    Finish
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
            
            {sessionPhase === 'active' && (
              <EMDRObject pattern={pattern} speed={speed} isActive={isSessionActive} />
            )}
            
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableRotate={false}
            />
          </Canvas>
        </div>

        {/* Control Panel */}
        {sessionPhase === 'active' && (
          <div className="w-80 bg-black/30 backdrop-blur-md p-6">
            <h3 className="text-white font-bold text-lg mb-6">Session Controls</h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-white/70 text-sm block mb-2">Pattern</label>
                <select
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-lg px-3 py-2"
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="infinity">Infinity</option>
                  <option value="butterfly">Butterfly</option>
                  <option value="circular">Circular</option>
                </select>
              </div>

              <div>
                <label className="text-white/70 text-sm block mb-2">
                  Speed: {speed.toFixed(1)} Hz
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={isSessionActive ? stopSession : startSession}
                className={`w-full py-3 rounded-full font-bold transition-all ${
                  isSessionActive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isSessionActive ? 'End Session' : 'Resume Session'}
              </button>

              <div className="pt-6 border-t border-white/20">
                <h4 className="text-white font-semibold mb-3">Quick Tips</h4>
                <ul className="text-white/60 text-sm space-y-2">
                  <li>• Follow the moving object with your eyes</li>
                  <li>• Keep your head still</li>
                  <li>• Breathe naturally</li>
                  <li>• It's okay to blink</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// EMDR Object Component
function EMDRObject({ pattern, speed, isActive }: { pattern: string; speed: number; isActive: boolean }) {
  const meshRef = useRef<any>();
  
  React.useEffect(() => {
    if (!meshRef.current || !isActive) return;
    
    const animate = () => {
      const time = Date.now() * 0.001 * speed;
      let x = 0, y = 0;
      
      switch(pattern) {
        case 'horizontal':
          x = Math.sin(time) * 3;
          y = 0;
          break;
        case 'infinity':
          x = Math.sin(time) * 3;
          y = Math.sin(time * 2) * 1.5;
          break;
        case 'butterfly':
          x = Math.sin(time) * Math.cos(time) * 3;
          y = Math.sin(time) * Math.sin(time) * 2;
          break;
        case 'circular':
          x = Math.cos(time) * 2;
          y = Math.sin(time) * 2;
          break;
      }
      
      meshRef.current.position.x = x;
      meshRef.current.position.y = y;
    };
    
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [pattern, speed, isActive]);
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color="#4CAF50"
        emissive="#4CAF50"
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

export default SessionPage;