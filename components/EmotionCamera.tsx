'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EmotionRecognitionService, EmotionData } from '@emdr42/core';

declare const faceapi: any;

interface EmotionCameraProps {
  onEmotionUpdate?: (data: EmotionData) => void;
  onFaceDetections?: (detections: any[]) => void;
  showPreview?: boolean;
  enabled?: boolean;
}

export const EmotionCamera: React.FC<EmotionCameraProps> = ({
  onEmotionUpdate,
  onFaceDetections,
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
  }, [onEmotionUpdate]);

  const handleFaceDetections = useCallback((detections: any[]) => {
    onFaceDetections?.(detections);

    // Draw face detection overlay on canvas
    if (canvasRef.current && videoRef.current && typeof faceapi !== 'undefined') {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length > 0) {
        const resized = faceapi.resizeResults(detections, {
          width: canvas.width,
          height: canvas.height,
        });
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
      }
    }
  }, [onFaceDetections]);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const service = new EmotionRecognitionService({
      updateFrequency: 200,
    });
    serviceRef.current = service;

    service.on('emotionUpdate', handleEmotionUpdate);
    service.on('faceDetections', handleFaceDetections);

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
  }, [enabled, handleEmotionUpdate, handleFaceDetections]);

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
        <div className="fixed bottom-4 right-4 w-40 h-30 rounded-xl overflow-hidden border border-white/20 bg-black/50 z-50">
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
            {currentEmotion}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionCamera;
