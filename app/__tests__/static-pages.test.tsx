/**
 * Spec для мелких статичных страниц (#150): billing success/cancel
 * (возврат из Stripe Checkout) и offline-fallback PWA.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import BillingSuccessPage from '@/app/billing/success/page';
import BillingCancelPage from '@/app/billing/cancel/page';
import OfflinePage from '@/app/offline/page';
import { ReloadButton } from '@/app/offline/ReloadButton';

describe('BillingSuccessPage (#150)', () => {
  it('заголовок об активации и ссылки на dashboard/билинг', () => {
    render(<BillingSuccessPage />);

    expect(screen.getByRole('heading', { name: /подписка активирована/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /на dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.getByRole('link', { name: /настройки билинга/i })).toHaveAttribute(
      'href',
      '/settings/billing',
    );
  });
});

describe('BillingCancelPage (#150)', () => {
  it('сообщение об отмене без негатива + возврат к тарифам', () => {
    render(<BillingCancelPage />);

    expect(screen.getByRole('heading', { name: /оплата отменена/i })).toBeInTheDocument();
    // Сообщение не должно давить — упоминание бесплатного плана
    expect(screen.getByText(/бесплатный план всегда доступен/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /вернуться к тарифам/i })).toHaveAttribute(
      'href',
      '/settings/billing',
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
  });
});

describe('OfflinePage (#150)', () => {
  it('объясняет деградацию: AI недоступен, BLS работает локально', () => {
    render(<OfflinePage />);

    expect(screen.getByRole('heading', { name: /нет подключения/i })).toBeInTheDocument();
    expect(screen.getByText(/AI-диалог и синхронизация временно не работают/)).toBeInTheDocument();
    expect(screen.getByText(/BLS-визуализация остаётся доступной/)).toBeInTheDocument();
  });

  it('ссылка на офлайн-BLS ведёт на /session', () => {
    render(<OfflinePage />);
    expect(screen.getByRole('link', { name: /bls офлайн/i })).toHaveAttribute('href', '/session');
  });

  // window.location.reload в jsdom 26 read-only — мокнуть нельзя,
  // проверяем только наличие кнопки (onClick — однострочный passthrough).
  it('кнопка «Повторить попытку» присутствует', () => {
    render(<ReloadButton />);
    expect(screen.getByRole('button', { name: /повторить попытку/i })).toBeInTheDocument();
  });
});
