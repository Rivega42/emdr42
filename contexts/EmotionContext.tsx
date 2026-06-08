'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  EmotionRecognitionService,
  EmotionData as CoreEmotionData,
} from '@emdr42/core';
import { CameraConsentDialog, hasCameraConsent } from '@/components/CameraConsentDialog';

interface EmotionData {
  timestamp: number;
  stress: number;
  engagement: number;
  positivity: number;
  arousal: number;
  valence: number;
  affects98?: Record<string, number>;
  basicExpressions?: Record<string, number>;
}

interface EmotionContextType {
  currentEmotions: EmotionData | null;
  emotionHistory: EmotionData[];
  isCalibrated: boolean;
  isTracking: boolean;
  needsConsent: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  calibrate: () => Promise<void>;
  getEmotionTrend: () => 'improving' | 'stable' | 'declining';
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

const mapCoreToContext = (core: CoreEmotionData): EmotionData => ({
  timestamp: core.timestamp,
  stress: core.behavioral.stress,
  engagement: core.behavioral.engagement,
  positivity: core.behavioral.positivity,
  arousal: core.dimensions.arousal,
  valence: core.dimensions.valence,
  affects98: core.affects98,
  basicExpressions: core.basicExpressions,
});

export const EmotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEmotions, setCurrentEmotions] = useState<EmotionData | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([]);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

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

    // HIPAA/GDPR: камера НЕ включается без явного информированного согласия.
    // Если consent ещё не получен — пробрасываем состояние UI, который
    // покажет CameraConsentDialog. После accept UI вызовет startTracking ещё раз.
    if (!hasCameraConsent()) {
      setNeedsConsent(true);
      return;
    }
    setNeedsConsent(false);

    const videoEl = videoElementRef.current;
    if (!videoEl) {
      console.warn('EmotionProvider: no video element set, call setVideoElement first');
      return;
    }

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
    // ВАЖНО: release MediaStream треков, иначе индикатор камеры остаётся
    // светиться даже после явного stop пользователем (PHI/приватность).
    serviceRef.current?.stopTracking();
    serviceRef.current?.releaseCamera();
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
        needsConsent,
        startTracking,
        stopTracking,
        calibrate,
        getEmotionTrend,
        setVideoElement,
      }}
    >
      {children}
      <CameraConsentDialog
        open={needsConsent}
        onAccept={() => {
          setNeedsConsent(false);
          // Перезапускаем — теперь consent есть и startTracking пройдёт дальше.
          void startTracking();
        }}
        onDecline={() => setNeedsConsent(false)}
      />
    </EmotionContext.Provider>
  );
};
