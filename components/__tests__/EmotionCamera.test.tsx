/**
 * Spec для components/EmotionCamera (#150) — компонент захвата камеры
 * для распознавания эмоций (consent gate, lifecycle, error states, preview).
 *
 * Мокаем @emdr42/core (face-api.js/TF.js недоступны в jsdom).
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockService = {
  on: jest.fn(),
  initialize: jest.fn(async () => {}),
  startTracking: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('@emdr42/core', () => ({
  EmotionRecognitionService: jest.fn(() => mockService),
}));

import { EmotionRecognitionService } from '@emdr42/core';
import { EmotionCamera } from '@/components/EmotionCamera';

const ServiceCtor = EmotionRecognitionService as jest.Mock;
const CONSENT_KEY = 'emdr42:camera_consent_v1';

const grantConsent = () => localStorage.setItem(CONSENT_KEY, 'granted');

/** Достаёт зарегистрированный listener по имени события */
const getListener = (event: string): ((data: unknown) => void) => {
  const call = (mockService.on as jest.Mock).mock.calls.find((c) => c[0] === event);
  if (!call) throw new Error(`${event} listener не зарегистрирован`);
  return call[1];
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockService.initialize.mockResolvedValue(undefined);
});

describe('EmotionCamera (#150)', () => {
  describe('consent gate (HIPAA/GDPR)', () => {
    it('без consent: onConsentNeeded вызван, сервис НЕ создан', () => {
      const onConsentNeeded = jest.fn();
      render(<EmotionCamera onConsentNeeded={onConsentNeeded} />);

      expect(onConsentNeeded).toHaveBeenCalledTimes(1);
      expect(ServiceCtor).not.toHaveBeenCalled();
    });

    it('с consent: сервис создаётся с updateFrequency 200 и инициализируется', async () => {
      grantConsent();
      render(<EmotionCamera />);

      expect(ServiceCtor).toHaveBeenCalledWith({ updateFrequency: 200 });
      await waitFor(() => expect(mockService.startTracking).toHaveBeenCalled());
      expect(mockService.initialize).toHaveBeenCalledWith(expect.any(HTMLVideoElement));
    });

    it('enabled=false: ничего не происходит даже с consent', () => {
      grantConsent();
      const onConsentNeeded = jest.fn();
      render(<EmotionCamera enabled={false} onConsentNeeded={onConsentNeeded} />);

      expect(ServiceCtor).not.toHaveBeenCalled();
      expect(onConsentNeeded).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('подписывается на emotionUpdate и faceDetections', async () => {
      grantConsent();
      render(<EmotionCamera />);
      await waitFor(() => expect(mockService.startTracking).toHaveBeenCalled());

      const events = (mockService.on as jest.Mock).mock.calls.map((c) => c[0]);
      expect(events).toEqual(expect.arrayContaining(['emotionUpdate', 'faceDetections']));
    });

    it('unmount → service.destroy (stopTracking + releaseCamera, камера гаснет)', async () => {
      grantConsent();
      const { unmount } = render(<EmotionCamera />);
      await waitFor(() => expect(mockService.startTracking).toHaveBeenCalled());

      unmount();
      expect(mockService.destroy).toHaveBeenCalled();
    });

    it('onEmotionUpdate пробрасывается наружу', async () => {
      grantConsent();
      const onEmotionUpdate = jest.fn();
      render(<EmotionCamera onEmotionUpdate={onEmotionUpdate} />);
      await waitFor(() => expect(mockService.startTracking).toHaveBeenCalled());

      const data = {
        emotions: { happy: 0.8, sad: 0.1 },
        timestamp: 1,
      };
      act(() => getListener('emotionUpdate')(data));

      expect(onEmotionUpdate).toHaveBeenCalledWith(data);
    });

    it('onFaceDetections пробрасывается наружу', async () => {
      grantConsent();
      const onFaceDetections = jest.fn();
      render(<EmotionCamera onFaceDetections={onFaceDetections} />);
      await waitFor(() => expect(mockService.startTracking).toHaveBeenCalled());

      const detections = [{ box: { x: 0, y: 0, width: 10, height: 10 } }];
      act(() => getListener('faceDetections')(detections));

      expect(onFaceDetections).toHaveBeenCalledWith(detections);
    });
  });

  describe('error states', () => {
    it('NotAllowedError → role=alert с сообщением про permissions', async () => {
      grantConsent();
      const err = new Error('denied');
      err.name = 'NotAllowedError';
      mockService.initialize.mockRejectedValueOnce(err);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<EmotionCamera />);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Доступ к камере отклонён/i);
      expect(mockService.startTracking).not.toHaveBeenCalled();
      (console.error as jest.Mock).mockRestore();
    });

    it('NotFoundError → сообщение «Камера не найдена»', async () => {
      grantConsent();
      const err = new Error('no cam');
      err.name = 'NotFoundError';
      mockService.initialize.mockRejectedValueOnce(err);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<EmotionCamera />);

      expect(await screen.findByRole('alert')).toHaveTextContent(/Камера не найдена/i);
      (console.error as jest.Mock).mockRestore();
    });

    it('прочая Error → её message в alert', async () => {
      grantConsent();
      mockService.initialize.mockRejectedValueOnce(new Error('face-api crash'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<EmotionCamera />);

      expect(await screen.findByRole('alert')).toHaveTextContent('face-api crash');
      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('preview', () => {
    it('showPreview + активный трекинг → overlay с доминантной эмоцией', async () => {
      grantConsent();
      render(<EmotionCamera showPreview />);
      await waitFor(() => expect(mockService.startTracking).toHaveBeenCalled());

      act(() =>
        getListener('emotionUpdate')({
          emotions: { happy: 0.9, neutral: 0.05, sad: 0.05 },
          timestamp: 1,
        }),
      );

      expect(screen.getByText('happy')).toBeInTheDocument();
    });

    it('без showPreview overlay не рендерится', async () => {
      grantConsent();
      const { container } = render(<EmotionCamera />);
      await waitFor(() => expect(mockService.startTracking).toHaveBeenCalled());

      expect(container.querySelector('canvas')).toBeNull();
    });

    it('video скрыт и помечен aria-hidden (поток только для анализа)', () => {
      grantConsent();
      const { container } = render(<EmotionCamera />);
      const video = container.querySelector('video');

      expect(video).toHaveAttribute('aria-hidden', 'true');
      expect(video).toHaveClass('hidden');
      expect(video).toHaveAttribute('playsinline');
    });
  });
});
