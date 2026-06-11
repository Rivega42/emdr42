/**
 * Spec для contexts/EmotionContext (#150) — управление camera-based emotion
 * recognition с consent gating (HIPAA/GDPR) и persistence калибровки.
 *
 * Мокаем:
 * - @emdr42/core: EmotionRecognitionService (тяжёлая face-api.js/TF.js зависимость)
 * - components/CameraConsentDialog: dialog UI + hasCameraConsent helper
 */
import { act, renderHook } from '@testing-library/react';
import React from 'react';

// ---- Mocks ----
const mockService = {
  on: jest.fn(),
  initialize: jest.fn(async () => {}),
  startTracking: jest.fn(),
  stopTracking: jest.fn(),
  releaseCamera: jest.fn(),
  calibrate: jest.fn(async () => {}),
  destroy: jest.fn(),
};

jest.mock('@emdr42/core', () => ({
  EmotionRecognitionService: jest.fn(() => mockService),
}));

const mockHasConsent = jest.fn(() => false);
jest.mock('@/components/CameraConsentDialog', () => ({
  CameraConsentDialog: ({ open }: { open: boolean }) =>
    open ? (
      <div role="dialog" aria-label="camera consent">
        camera consent
      </div>
    ) : null,
  hasCameraConsent: () => mockHasConsent(),
}));

import { EmotionRecognitionService } from '@emdr42/core';
import { EmotionProvider, useEmotion } from '@/contexts/EmotionContext';

const ServiceCtor = EmotionRecognitionService as jest.Mock;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EmotionProvider>{children}</EmotionProvider>
);

/** Достаёт зарегистрированный emotionUpdate callback из mock-сервиса */
const getEmotionEmitter = (): ((data: unknown) => void) => {
  const call = (mockService.on as jest.Mock).mock.calls.find((c) => c[0] === 'emotionUpdate');
  if (!call) throw new Error('emotionUpdate listener не зарегистрирован');
  return call[1];
};

const corePoint = (timestamp: number, stress: number) => ({
  timestamp,
  behavioral: { stress, engagement: 0.5, positivity: 0.5 },
  dimensions: { arousal: 0.5, valence: 0.5 },
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockHasConsent.mockReturnValue(false);
  mockService.initialize.mockResolvedValue(undefined);
});

describe('EmotionContext (#150)', () => {
  describe('useEmotion без провайдера', () => {
    it('бросает Error', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useEmotion())).toThrow(
        /useEmotion must be used within an EmotionProvider/,
      );
      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('initial state', () => {
    it('пустые значения по умолчанию', () => {
      const { result } = renderHook(() => useEmotion(), { wrapper });
      expect(result.current.currentEmotions).toBeNull();
      expect(result.current.emotionHistory).toEqual([]);
      expect(result.current.isCalibrated).toBe(false);
      expect(result.current.isTracking).toBe(false);
      expect(result.current.needsConsent).toBe(false);
    });

    it('isCalibrated=true восстанавливается из localStorage', () => {
      localStorage.setItem('emotion_calibrated', 'true');
      const { result } = renderHook(() => useEmotion(), { wrapper });
      expect(result.current.isCalibrated).toBe(true);
    });
  });

  describe('consent gating (HIPAA/GDPR)', () => {
    it('startTracking без consent → needsConsent=true, сервис НЕ создаётся, камера НЕ включается', async () => {
      mockHasConsent.mockReturnValue(false);
      const { result } = renderHook(() => useEmotion(), { wrapper });

      await act(async () => {
        await result.current.startTracking();
      });

      expect(result.current.needsConsent).toBe(true);
      expect(result.current.isTracking).toBe(false);
      expect(ServiceCtor).not.toHaveBeenCalled();
      expect(mockService.initialize).not.toHaveBeenCalled();
    });

    it('startTracking с consent но без video-элемента → tracking не стартует (warn)', async () => {
      mockHasConsent.mockReturnValue(true);
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useEmotion(), { wrapper });
      await act(async () => {
        await result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(false);
      expect(result.current.needsConsent).toBe(false);
      expect(mockService.startTracking).not.toHaveBeenCalled();
      (console.warn as jest.Mock).mockRestore();
    });

    it('startTracking с consent + video → initialize(videoEl) + startTracking + isTracking=true', async () => {
      mockHasConsent.mockReturnValue(true);
      const { result } = renderHook(() => useEmotion(), { wrapper });

      const videoEl = document.createElement('video');
      act(() => result.current.setVideoElement(videoEl));
      await act(async () => {
        await result.current.startTracking();
      });

      expect(ServiceCtor).toHaveBeenCalledWith({ updateFrequency: 200 });
      expect(mockService.initialize).toHaveBeenCalledWith(videoEl);
      expect(mockService.startTracking).toHaveBeenCalled();
      expect(result.current.isTracking).toBe(true);
    });

    it('повторный startTracking при активном трекинге — no-op', async () => {
      mockHasConsent.mockReturnValue(true);
      const { result } = renderHook(() => useEmotion(), { wrapper });

      act(() => result.current.setVideoElement(document.createElement('video')));
      await act(async () => {
        await result.current.startTracking();
      });
      await act(async () => {
        await result.current.startTracking();
      });

      expect(mockService.startTracking).toHaveBeenCalledTimes(1);
    });

    it('ошибка initialize (камера занята) → isTracking=false, error в консоль', async () => {
      mockHasConsent.mockReturnValue(true);
      mockService.initialize.mockRejectedValueOnce(new Error('camera busy'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useEmotion(), { wrapper });
      act(() => result.current.setVideoElement(document.createElement('video')));
      await act(async () => {
        await result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(false);
      expect(console.error).toHaveBeenCalled();
      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('stopTracking', () => {
    it('stopTracking + releaseCamera (PHI: камера должна гаснуть) + isTracking=false', async () => {
      mockHasConsent.mockReturnValue(true);
      const { result } = renderHook(() => useEmotion(), { wrapper });

      act(() => result.current.setVideoElement(document.createElement('video')));
      await act(async () => {
        await result.current.startTracking();
      });
      act(() => result.current.stopTracking());

      expect(mockService.stopTracking).toHaveBeenCalled();
      expect(mockService.releaseCamera).toHaveBeenCalled();
      expect(result.current.isTracking).toBe(false);
    });

    it('stopTracking без старта — no-op без падений', () => {
      const { result } = renderHook(() => useEmotion(), { wrapper });
      expect(() => act(() => result.current.stopTracking())).not.toThrow();
    });
  });

  describe('calibrate', () => {
    it('после старта: service.calibrate + isCalibrated=true + localStorage', async () => {
      mockHasConsent.mockReturnValue(true);
      const { result } = renderHook(() => useEmotion(), { wrapper });

      act(() => result.current.setVideoElement(document.createElement('video')));
      await act(async () => {
        await result.current.startTracking();
      });
      await act(async () => {
        await result.current.calibrate();
      });

      expect(mockService.calibrate).toHaveBeenCalled();
      expect(result.current.isCalibrated).toBe(true);
      expect(localStorage.getItem('emotion_calibrated')).toBe('true');
    });

    it('без инициализированного сервиса — no-op + warn', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useEmotion(), { wrapper });

      await act(async () => {
        await result.current.calibrate();
      });

      expect(mockService.calibrate).not.toHaveBeenCalled();
      expect(result.current.isCalibrated).toBe(false);
      (console.warn as jest.Mock).mockRestore();
    });
  });

  describe('emotionUpdate → state', () => {
    const startTracked = async (result: { current: ReturnType<typeof useEmotion> }) => {
      mockHasConsent.mockReturnValue(true);
      act(() => result.current.setVideoElement(document.createElement('video')));
      await act(async () => {
        await result.current.startTracking();
      });
    };

    it('маппинг core → context: behavioral/dimensions/affects98/basicExpressions', async () => {
      const { result } = renderHook(() => useEmotion(), { wrapper });
      await startTracked(result);
      const emit = getEmotionEmitter();

      act(() => {
        emit({
          timestamp: 1000,
          behavioral: { stress: 0.6, engagement: 0.7, positivity: 0.8 },
          dimensions: { arousal: 0.9, valence: 0.4 },
          affects98: { joy: 0.5 },
          basicExpressions: { happy: 0.5 },
        });
      });

      expect(result.current.currentEmotions).toMatchObject({
        timestamp: 1000,
        stress: 0.6,
        engagement: 0.7,
        positivity: 0.8,
        arousal: 0.9,
        valence: 0.4,
        affects98: { joy: 0.5 },
        basicExpressions: { happy: 0.5 },
      });
    });

    it('emotionHistory копит точки и обрезается до 100 последних', async () => {
      const { result } = renderHook(() => useEmotion(), { wrapper });
      await startTracked(result);
      const emit = getEmotionEmitter();

      act(() => {
        for (let i = 0; i < 150; i++) emit(corePoint(i, 0.5));
      });

      expect(result.current.emotionHistory).toHaveLength(100);
      expect(result.current.emotionHistory[0].timestamp).toBe(50);
      expect(result.current.emotionHistory[99].timestamp).toBe(149);
    });
  });

  describe('getEmotionTrend', () => {
    const feedAndGetTrend = async (olderStress: number, recentStress: number): Promise<string> => {
      const { result } = renderHook(() => useEmotion(), { wrapper });
      mockHasConsent.mockReturnValue(true);
      act(() => result.current.setVideoElement(document.createElement('video')));
      await act(async () => {
        await result.current.startTracking();
      });
      const emit = getEmotionEmitter();
      act(() => {
        for (let i = 0; i < 10; i++) emit(corePoint(i, olderStress));
        for (let i = 10; i < 20; i++) emit(corePoint(i, recentStress));
      });
      return result.current.getEmotionTrend();
    };

    it('< 10 точек → stable', () => {
      const { result } = renderHook(() => useEmotion(), { wrapper });
      expect(result.current.getEmotionTrend()).toBe('stable');
    });

    it('стабильный stress → stable', async () => {
      expect(await feedAndGetTrend(0.5, 0.5)).toBe('stable');
    });

    it('падение stress > 0.1 → improving', async () => {
      expect(await feedAndGetTrend(0.8, 0.3)).toBe('improving');
    });

    it('рост stress > 0.1 → declining', async () => {
      expect(await feedAndGetTrend(0.2, 0.7)).toBe('declining');
    });
  });
});
