/**
 * EMDR Visualization Component
 * Main 3D visualization using Three.js
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MovementPatterns } from '@emdr42/core/patterns/movements';
import { EmotionRecognitionService } from '@emdr42/core/services/emotion-recognition';
import { useFrame, useThree } from '@react-three/fiber';
import { Trail, Float, Sparkles } from '@react-three/drei';

interface VisualizationProps {
  pattern?: string;
  speed?: number;
  size?: number;
  color?: string;
  trailEnabled?: boolean;
  particlesEnabled?: boolean;
  onEmotionUpdate?: (data: any) => void;
  emotionService?: EmotionRecognitionService;
  adaptiveMode?: boolean;
}

export const EMDRVisualization: React.FC<VisualizationProps> = ({
  pattern = 'horizontal',
  speed = 1.0,
  size = 1.0,
  color = '#4CAF50',
  trailEnabled = true,
  particlesEnabled = true,
  onEmotionUpdate,
  emotionService,
  adaptiveMode = false
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<any[]>([]);
  const [currentPattern, setCurrentPattern] = useState(pattern);
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [emotionData, setEmotionData] = useState<any>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  const { camera, gl } = useThree();

  // Initialize emotion service listeners
  useEffect(() => {
    if (!emotionService) return;

    const handleEmotionUpdate = (data: any) => {
      setEmotionData(data);
      onEmotionUpdate?.(data);

      // Adaptive adjustments
      if (adaptiveMode) {
        adaptToEmotionalState(data);
      }
    };

    const handleAlert = (alert: any) => {
      if (alert.severity === 'critical') {
        // Emergency stop or transition to calming pattern
        setCurrentPattern('wave');
        setCurrentSpeed(0.5);
      }
    };

    emotionService.on('emotionUpdate', handleEmotionUpdate);
    emotionService.on('alert', handleAlert);

    return () => {
      emotionService.off('emotionUpdate', handleEmotionUpdate);
      emotionService.off('alert', handleAlert);
    };
  }, [emotionService, adaptiveMode, onEmotionUpdate]);

  // Adapt to emotional state
  const adaptToEmotionalState = useCallback((data: any) => {
    if (!data) return;

    // Adjust speed based on stress
    if (data.behavioral.stress > 0.7) {
      setCurrentSpeed(prev => Math.max(0.3, prev * 0.9));
    } else if (data.behavioral.stress < 0.3) {
      setCurrentSpeed(prev => Math.min(2.0, prev * 1.05));
    }

    // Change pattern based on engagement
    if (data.behavioral.engagement < 0.3) {
      const newPattern = MovementPatterns.selectAdaptivePattern(
        data.behavioral.stress,
        data.behavioral.engagement,
        currentPattern
      );
      if (newPattern !== currentPattern) {
        setCurrentPattern(newPattern);
      }
    }
  }, [currentPattern]);

  // Animation frame
  useFrame((state) => {
    if (!meshRef.current) return;

    const patternObj = MovementPatterns.getPattern(currentPattern);
    if (!patternObj) return;

    const position = patternObj.calculate(
      state.clock.elapsedTime,
      currentSpeed,
      size
    );

    meshRef.current.position.set(position.x, position.y, position.z);

    // Update trail
    if (trailEnabled && trailRef.current.length > 0) {
      trailRef.current.forEach((trail, index) => {
        const delay = index * 0.02;
        const delayedTime = state.clock.elapsedTime - delay;
        const delayedPos = patternObj.calculate(delayedTime, currentSpeed, size);
        trail.position.set(delayedPos.x, delayedPos.y, delayedPos.z);
      });
    }

    // Pulsing effect based on emotional arousal
    if (emotionData?.dimensions?.arousal) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 
                    emotionData.dimensions.arousal * 0.1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <>
      {/* Main EMDR object */}
      <Float
        speed={2}
        rotationIntensity={0.5}
        floatIntensity={0.5}
      >
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        
        {/* Glow effect */}
        <mesh scale={[1.5, 1.5, 1.5]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
          />
        </mesh>
      </Float>

      {/* Trail effect */}
      {trailEnabled && (
        <Trail
          width={5}
          length={10}
          color={new THREE.Color(color)}
          attenuation={(t) => t * t}
        >
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </Trail>
      )}

      {/* Particle effects */}
      {particlesEnabled && (
        <Sparkles
          count={50}
          scale={size * 3}
          size={2}
          speed={0.5}
          opacity={0.3}
          color={color}
        />
      )}

      {/* Ambient lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={color} />
    </>
  );
};

// Control Panel Component
export const ControlPanel: React.FC<{
  pattern: string;
  speed: number;
  size: number;
  color: string;
  onPatternChange: (pattern: string) => void;
  onSpeedChange: (speed: number) => void;
  onSizeChange: (size: number) => void;
  onColorChange: (color: string) => void;
  emotionData?: any;
  onCalibrate?: () => void;
}> = ({
  pattern,
  speed,
  size,
  color,
  onPatternChange,
  onSpeedChange,
  onSizeChange,
  onColorChange,
  emotionData,
  onCalibrate
}) => {
  const patterns = MovementPatterns.getPatternNames();

  return (
    <div className="control-panel">
      <div className="control-group">
        <label htmlFor="pattern">Movement Pattern</label>
        <select
          id="pattern"
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
        >
          {patterns.map(p => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="speed">Speed: {speed.toFixed(1)} Hz</label>
        <input
          id="speed"
          type="range"
          min="0.3"
          max="2.0"
          step="0.1"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label htmlFor="size">Size: {size.toFixed(1)}</label>
        <input
          id="size"
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={size}
          onChange={(e) => onSizeChange(parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label htmlFor="color">Color</label>
        <input
          id="color"
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
        />
      </div>

      {emotionData && (
        <div className="emotion-display">
          <h3>Emotional State</h3>
          <div className="emotion-metric">
            <span>Stress:</span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${emotionData.behavioral.stress * 100}%` }}
              />
            </div>
            <span>{(emotionData.behavioral.stress * 100).toFixed(0)}%</span>
          </div>
          
          <div className="emotion-metric">
            <span>Engagement:</span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${emotionData.behavioral.engagement * 100}%` }}
              />
            </div>
            <span>{(emotionData.behavioral.engagement * 100).toFixed(0)}%</span>
          </div>
          
          <div className="emotion-metric">
            <span>Positivity:</span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${emotionData.behavioral.positivity * 100}%` }}
              />
            </div>
            <span>{(emotionData.behavioral.positivity * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {onCalibrate && (
        <button onClick={onCalibrate} className="calibrate-button">
          Calibrate Emotions
        </button>
      )}
    </div>
  );
};

// Session Timer Component
export const SessionTimer: React.FC<{
  isActive: boolean;
  duration: number;
  onComplete?: () => void;
}> = ({ isActive, duration, onComplete }) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setTimeRemaining(duration);
      setTimeElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, duration, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="session-timer">
      <div className="timer-display">
        <span className="timer-label">Session Time:</span>
        <span className="timer-value">{formatTime(timeElapsed)}</span>
      </div>
      <div className="timer-display">
        <span className="timer-label">Remaining:</span>
        <span className="timer-value">{formatTime(timeRemaining)}</span>
      </div>
      <div className="progress-ring">
        <svg width="100" height="100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="5"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#4CAF50"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(timeElapsed / duration) * 283} 283`}
            transform="rotate(-90 50 50)"
          />
        </svg>
      </div>
    </div>
  );
};

export default EMDRVisualization;
