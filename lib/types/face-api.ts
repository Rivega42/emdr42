/**
 * Minimal types для face-api.js, который грузится через CDN <Script> в layout.tsx
 * и доступен глобально как `window.faceapi`. Полная типизация — отдельный
 * пакет `@types/face-api.js`, но он требует ESM-инсталляции face-api.js
 * (которой у нас нет — мы используем CDN-build).
 */

export interface FaceDetection {
  detection: {
    box: { x: number; y: number; width: number; height: number };
    score: number;
  };
  expressions?: Record<string, number>;
  landmarks?: unknown;
}

declare global {
  interface Window {
    faceapi?: {
      resizeResults: (
        results: FaceDetection[],
        dimensions: { width: number; height: number },
      ) => FaceDetection[];
      draw: {
        drawDetections: (canvas: HTMLCanvasElement, detections: FaceDetection[]) => void;
        drawFaceLandmarks: (canvas: HTMLCanvasElement, detections: FaceDetection[]) => void;
      };
    };
  }
}

export {};
