'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EmotionRecognitionService, type EmotionData } from '@emdr42/core';
import type { FaceDetection } from '@/lib/types/face-api';
import { hasCameraConsent } from '@/components/CameraConsentDialog';

interface EmotionCameraProps {
  onEmotionUpdate?: (data: EmotionData) => void;
  onFaceDetections?: (detections: FaceDetection[]) => void;
  showPreview?: boolean;
  enabled?: boolean;
  /**
   * Callback when consent is missing (parent should open CameraConsentDialog).
   */
  onConsentNeeded?: () => void;
}

export const EmotionCamera: React.FC<EmotionCameraProps> = ({
  onEmotionUpdate,
  onFaceDetections,
  showPreview = false,
  enabled = true,
  onConsentNeeded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const serviceRef = useRef<EmotionRecognitionService | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>('--');
  const [isActive, setIsActive] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  const handleEmotionUpdate = useCallback((data: EmotionData) => {
    onEmotionUpdate?.(data);

    // Determine dominant emotion for preview overlay
    const emotions = data.emotions;
    const entries = Object.entries(emotions) as [string, number][];
    const dominant = entries.reduce((max, entry) =>
      entry[1] > max[1] ? entry : max, entries[0]);
    setCurrentEmotion(dominant[0]);
  }, [onEmotionUpdate]);

  const handleFaceDetections = useCallback(
    (detections: FaceDetection[]) => {
      onFaceDetections?.(detections);

      const faceapi = typeof window !== 'undefined' ? window.faceapi : undefined;
      if (!canvasRef.current || !videoRef.current || !faceapi) return;

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
    },
    [onFaceDetections],
  );

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    // HIPAA/GDPR: камера НЕ включается без явного информированного согласия.
    if (!hasCameraConsent()) {
      onConsentNeeded?.();
      return;
    }

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
        setPermError(null);
      })
      .catch((err) => {
        const msg =
          err instanceof Error
            ? err.name === 'NotAllowedError'
              ? 'Доступ к камере отклонён в браузере. Проверьте permissions.'
              : err.name === 'NotFoundError'
                ? 'Камера не найдена.'
                : err.message
            : 'Не удалось включить камеру';
        setPermError(msg);
        console.error('EmotionCamera: failed to initialize', err);
      });

    return () => {
      // destroy() = stopTracking + releaseCamera — индикатор камеры гаснет.
      service.destroy();
      serviceRef.current = null;
      setIsActive(false);
    };
  }, [enabled, handleEmotionUpdate, handleFaceDetections, onConsentNeeded]);

  return (
    <div className="emotion-camera">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={showPreview && isActive ? 'hidden' : 'hidden'}
        aria-hidden="true"
      />
      {permError && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 max-w-xs bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-md z-50"
        >
          {permError}
        </div>
      )}
      {showPreview && isActive && (
        <div className="fixed bottom-4 right-4 w-40 h-30 rounded-xl overflow-hidden border border-white/20 bg-black/50 z-50">
          <div className="relative w-full h-full">
            {/*
              Preview pointing к тому же service-stream — НЕ создаём второй
              <video ref> (это перетирало ref у service в исходной версии).
              Вместо этого reuse mediaStream через srcObject отдельно.
            */}
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
