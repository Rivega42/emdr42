/**
 * Spec для components/CameraConsentDialog (#150) — информированное согласие
 * до первого getUserMedia (HIPAA/GDPR gate).
 *
 * Покрывает: helpers (hasCameraConsent/clearCameraConsent), рендер по open,
 * accept → localStorage 'granted' + onAccept, decline, Escape, focus-trap
 * на 2 кнопки, возврат фокуса, a11y-атрибуты.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {
  CameraConsentDialog,
  hasCameraConsent,
  clearCameraConsent,
} from '@/components/CameraConsentDialog';

const CONSENT_KEY = 'emdr42:camera_consent_v1';

beforeEach(() => {
  localStorage.clear();
});

describe('CameraConsentDialog helpers (#150)', () => {
  it('hasCameraConsent: false по умолчанию', () => {
    expect(hasCameraConsent()).toBe(false);
  });

  it('hasCameraConsent: true только при значении "granted"', () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    expect(hasCameraConsent()).toBe(true);

    localStorage.setItem(CONSENT_KEY, 'denied');
    expect(hasCameraConsent()).toBe(false);
  });

  it('clearCameraConsent: удаляет ключ (logout / smart-reset)', () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    clearCameraConsent();
    expect(hasCameraConsent()).toBe(false);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });
});

describe('CameraConsentDialog (#150)', () => {
  const noop = () => {};

  it('open=false → ничего не рендерится', () => {
    const { container } = render(
      <CameraConsentDialog open={false} onAccept={noop} onDecline={noop} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('open=true → dialog с заголовком и двумя кнопками', () => {
    render(<CameraConsentDialog open onAccept={noop} onDecline={noop} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Использование камеры/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Согласен, включить камеру/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Без камеры/i })).toBeInTheDocument();
  });

  it('accept: пишет "granted" в localStorage и вызывает onAccept', async () => {
    const onAccept = jest.fn();
    render(<CameraConsentDialog open onAccept={onAccept} onDecline={noop} />);

    await userEvent.setup().click(screen.getByRole('button', { name: /Согласен/i }));

    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(hasCameraConsent()).toBe(true);
  });

  it('decline: вызывает onDecline и НЕ пишет consent', async () => {
    const onDecline = jest.fn();
    render(<CameraConsentDialog open onAccept={noop} onDecline={onDecline} />);

    await userEvent.setup().click(screen.getByRole('button', { name: /Без камеры/i }));

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it('Escape → onDecline', async () => {
    const onDecline = jest.fn();
    render(<CameraConsentDialog open onAccept={noop} onDecline={onDecline} />);

    await userEvent.setup().keyboard('{Escape}');
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('автофокус на кнопке accept при открытии', () => {
    render(<CameraConsentDialog open onAccept={noop} onDecline={noop} />);
    expect(screen.getByRole('button', { name: /Согласен/i })).toHaveFocus();
  });

  it('focus-trap: Tab с последней кнопки циклит на первую', async () => {
    render(<CameraConsentDialog open onAccept={noop} onDecline={noop} />);
    const user = userEvent.setup();
    const acceptBtn = screen.getByRole('button', { name: /Согласен/i });
    const declineBtn = screen.getByRole('button', { name: /Без камеры/i });

    // Фокус на accept (последняя в DOM-порядке focusables: decline, accept)
    expect(acceptBtn).toHaveFocus();
    await user.tab();
    expect(declineBtn).toHaveFocus();
    await user.tab();
    expect(acceptBtn).toHaveFocus();
  });

  it('focus-trap: Shift+Tab с первой кнопки циклит на последнюю', async () => {
    render(<CameraConsentDialog open onAccept={noop} onDecline={noop} />);
    const user = userEvent.setup();
    const acceptBtn = screen.getByRole('button', { name: /Согласен/i });
    const declineBtn = screen.getByRole('button', { name: /Без камеры/i });

    await user.tab(); // accept → decline (первая focusable)
    expect(declineBtn).toHaveFocus();
    await user.tab({ shift: true });
    expect(acceptBtn).toHaveFocus();
  });

  it('возврат фокуса на предыдущий элемент при закрытии', async () => {
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();

    const { rerender } = render(<CameraConsentDialog open onAccept={noop} onDecline={noop} />);
    expect(screen.getByRole('button', { name: /Согласен/i })).toHaveFocus();

    rerender(<CameraConsentDialog open={false} onAccept={noop} onDecline={noop} />);
    expect(outside).toHaveFocus();

    document.body.removeChild(outside);
  });

  it('a11y: aria-modal, aria-labelledby и aria-describedby связаны', () => {
    render(<CameraConsentDialog open onAccept={noop} onDecline={noop} />);
    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'camera-consent-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'camera-consent-desc');
    expect(screen.getByText(/Использование камеры/i)).toHaveAttribute('id', 'camera-consent-title');
  });

  it('текст содержит ключевые дисклеймеры приватности (локальная обработка, отзыв согласия)', () => {
    render(<CameraConsentDialog open onAccept={noop} onDecline={noop} />);
    expect(screen.getByText(/обрабатывается локально/i)).toBeInTheDocument();
    expect(screen.getByText(/можно отозвать/i)).toBeInTheDocument();
  });
});
