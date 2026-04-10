import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  EmotionRecognitionService,
  EmotionData as CoreEmotionData,
} from '@emdr42/core';

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
  /** Provide a video element so the service can access the camera */
  setVideoElement: (el: HTMLVideoElement | null) => void;
}

const EmotionContext = createContext<EmotionContextType | undefined>(undefined);

export const useEmotion = () => {
  const context = useContext(EmotionContext);
  if (!context) {
    throw new Error('useEmotion must be used within an EmotionProvider');
  }
  return context;
};

/**
 * Map the full CoreEmotionData from the recognition service
 * to the simplified EmotionData used by context consumers.
 */
const mapCoreToContext = (core: CoreEmotionData): EmotionData => ({
  timestamp: core.timestamp,
  stress: core.behavioral.stress,
  engagement: core.behavioral.engagement,
  positivity: core.behavioral.positivity,
  arousal: core.dimensions.arousal,
  valence: core.dimensions.valence,
});

export const EmotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEmotions, setCurrentEmotions] = useState<EmotionData | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([]);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const serviceRef = useRef<EmotionRecognitionService | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const calibrationStatus = localStorage.getItem('emotion_calibrated');
    if (calibrationStatus === 'true') {
      setIsCalibrated(true);
    }

    return () => {
      serviceRef.current?.destroy();
      serviceRef.current = null;
    };
  }, []);

  const handleEmotionUpdate = useCallback((data: CoreEmotionData) => {
    const mapped = mapCoreToContext(data);
    setCurrentEmotions(mapped);
    setEmotionHistory(prev => {
      const updated = [...prev, mapped];
      return updated.slice(-100);
    });
  }, []);

  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoElementRef.current = el;
  }, []);

  const startTracking = useCallback(async () => {
    if (isTracking) return;

    const videoEl = videoElementRef.current;
    if (!videoEl) {
      console.warn('EmotionProvider: no video element set, call setVideoElement first');
      return;
    }

    // Create service if it doesn't exist
    if (!serviceRef.current) {
      const service = new EmotionRecognitionService({ updateFrequency: 200 });
      service.on('emotionUpdate', handleEmotionUpdate);
      serviceRef.current = service;
    }

    try {
      await serviceRef.current.initialize(videoEl);
      serviceRef.current.startTracking();
      setIsTracking(true);
    } catch (err) {
      console.error('EmotionProvider: failed to start tracking', err);
    }
  }, [isTracking, handleEmotionUpdate]);

  const stopTracking = useCallback(() => {
    serviceRef.current?.stopTracking();
    setIsTracking(false);
  }, []);

  const calibrate = async (): Promise<void> => {
    if (!serviceRef.current) {
      console.warn('EmotionProvider: service not initialized, cannot calibrate');
      return;
    }

    await serviceRef.current.calibrate();
    setIsCalibrated(true);
    localStorage.setItem('emotion_calibrated', 'true');
  };

  const getEmotionTrend = (): 'improving' | 'stable' | 'declining' => {
    if (emotionHistory.length < 10) return 'stable';

    const recent = emotionHistory.slice(-10);
    const older = emotionHistory.slice(-20, -10);

    if (older.length === 0) return 'stable';

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
        getEmotionTrend,
        setVideoElement,
      }}
    >
      {children}
    </EmotionContext.Provider>
  );
};
