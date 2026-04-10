'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EmotionRecognitionService, EmotionData } from '@emdr42/core';

interface EmotionCameraProps {
  onEmotionUpdate?: (data: EmotionData) => void;
  showPreview?: boolean;
  enabled?: boolean;
}

export const EmotionCamera: React.FC<EmotionCameraProps> = ({
  onEmotionUpdate,
  showPreview = false,
  enabled = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const serviceRef = useRef<EmotionRecognitionService | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>('--');
  const [isActive, setIsActive] = useState(false);

  const handleEmotionUpdate = useCallback((data: EmotionData) => {
    onEmotionUpdate?.(data);

    // Determine dominant emotion for preview overlay
    const emotions = data.emotions;
    const entries = Object.entries(emotions) as [string, number][];
    const dominant = entries.reduce((max, entry) =>
      entry[1] > max[1] ? entry : max, entries[0]);
    setCurrentEmotion(dominant[0]);

    // Draw video frame to preview canvas
    if (showPreview && canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth || 160;
        canvasRef.current.height = videoRef.current.videoHeight || 120;
        ctx.drawImage(videoRef.current, 0, 0);
      }
    }
  }, [onEmotionUpdate, showPreview]);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const service = new EmotionRecognitionService({
      updateFrequency: 200,
    });
    serviceRef.current = service;

    service.on('emotionUpdate', handleEmotionUpdate);

    service.initialize(videoRef.current)
      .then(() => {
        service.startTracking();
        setIsActive(true);
      })
      .catch((err) => {
        console.error('EmotionCamera: failed to initialize', err);
      });

    return () => {
      service.destroy();
      serviceRef.current = null;
      setIsActive(false);
    };
  }, [enabled, handleEmotionUpdate]);

  return (
    <div className="emotion-camera">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
        aria-hidden="true"
      />
      {showPreview && isActive && (
        <div className="fixed bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border border-white/20 bg-black/50 z-50">
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
            {currentEmotion}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionCamera;
