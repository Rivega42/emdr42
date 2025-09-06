import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface EmotionData {
  timestamp: number;
  stress: number;
  engagement: number;
  positivity: number;
  arousal: number;
  valence: number;
}

interface EmotionContextType {
  currentEmotions: EmotionData | null;
  emotionHistory: EmotionData[];
  isCalibrated: boolean;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  calibrate: () => Promise<void>;
  getEmotionTrend: () => 'improving' | 'stable' | 'declining';
}

const EmotionContext = createContext<EmotionContextType | undefined>(undefined);

export const useEmotion = () => {
  const context = useContext(EmotionContext);
  if (!context) {
    throw new Error('useEmotion must be used within an EmotionProvider');
  }
  return context;
};

export const EmotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEmotions, setCurrentEmotions] = useState<EmotionData | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([]);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load calibration status
    const calibrationStatus = localStorage.getItem('emotion_calibrated');
    if (calibrationStatus === 'true') {
      setIsCalibrated(true);
    }

    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, []);

  const generateMockEmotionData = (): EmotionData => {
    // In production, this would use MorphCast SDK
    return {
      timestamp: Date.now(),
      stress: Math.random() * 0.5 + 0.3,
      engagement: Math.random() * 0.3 + 0.5,
      positivity: Math.random() * 0.3 + 0.4,
      arousal: Math.random() * 0.4 + 0.3,
      valence: Math.random() * 2 - 1
    };
  };

  const startTracking = useCallback(() => {
    if (isTracking) return;
    
    setIsTracking(true);
    const interval = setInterval(() => {
      const emotionData = generateMockEmotionData();
      setCurrentEmotions(emotionData);
      setEmotionHistory(prev => {
        const updated = [...prev, emotionData];
        // Keep only last 100 data points
        return updated.slice(-100);
      });
    }, 1000);
    
    setTrackingInterval(interval);
  }, [isTracking]);

  const stopTracking = useCallback(() => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
    setIsTracking(false);
  }, [trackingInterval]);

  const calibrate = async (): Promise<void> => {
    // Simulate calibration process
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsCalibrated(true);
        localStorage.setItem('emotion_calibrated', 'true');
        resolve();
      }, 3000);
    });
  };

  const getEmotionTrend = (): 'improving' | 'stable' | 'declining' => {
    if (emotionHistory.length < 10) return 'stable';
    
    const recent = emotionHistory.slice(-10);
    const older = emotionHistory.slice(-20, -10);
    
    const recentAvgStress = recent.reduce((sum, e) => sum + e.stress, 0) / recent.length;
    const olderAvgStress = older.reduce((sum, e) => sum + e.stress, 0) / older.length;
    
    if (recentAvgStress < olderAvgStress - 0.1) return 'improving';
    if (recentAvgStress > olderAvgStress + 0.1) return 'declining';
    return 'stable';
  };

  return (
    <EmotionContext.Provider
      value={{
        currentEmotions,
        emotionHistory,
        isCalibrated,
        isTracking,
        startTracking,
        stopTracking,
        calibrate,
        getEmotionTrend
      }}
    >
      {children}
    </EmotionContext.Provider>
  );
};}