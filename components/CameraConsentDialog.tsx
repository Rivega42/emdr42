'use client';

import React, { useEffect, useRef } from 'react';

const CONSENT_KEY = 'emdr42:camera_consent_v1';

export function hasCameraConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function clearCameraConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
}

interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Информированное согласие до первого `getUserMedia`.
 * HIPAA/GDPR требует явного user gesture + explanation. Без него
 * автоматический `requestCameraAccess()` в EmotionContext = compliance violation.
 *
 * Cрабатывает один раз на устройство — потом результат запоминается в localStorage.
 * `clearCameraConsent()` — для logout / smart-reset.
 */
export const CameraConsentDialog: React.FC<Props> = ({ open, onAccept, onDecline }) => {
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    acceptBtnRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline();
      // Простой focus-trap на 2 кнопки
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      prevFocus?.focus?.();
    };
  }, [open, onDecline]);

  if (!open) return null;

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'granted');
    } catch {
      /* ignore — пользователь увидит prompt снова */
    }
    onAccept();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-consent-title"
      aria-describedby="camera-consent-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
      >
        <h2 id="camera-consent-title" className="text-xl font-bold text-gray-900">
          Использование камеры для анализа эмоций
        </h2>
        <div id="camera-consent-desc" className="text-sm text-gray-600 space-y-2">
          <p>
            Для адаптации EMDR-сессии под ваше состояние мы используем камеру и
            анализ выражения лица. Это позволяет ассистенту корректировать темп
            и интенсивность стимуляции в реальном времени.
          </p>
          <p>
            <strong>Важно:</strong> видеопоток обрабатывается локально в вашем
            браузере. На наши серверы уходят только числовые показатели
            (уровень стресса, valence, arousal), а не сам видеокадр.
          </p>
          <p>
            Согласие можно отозвать в любой момент в настройках. Без камеры
            сессия будет работать в упрощённом режиме без эмоциональной
            адаптации.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Без камеры
          </button>
          <button
            ref={acceptBtnRef}
            type="button"
            onClick={accept}
            className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-semibold"
          >
            Согласен, включить камеру
          </button>
        </div>
      </div>
    </div>
  );
};
