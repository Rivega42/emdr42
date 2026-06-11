/**
 * Spec для app/(protected)/settings/billing/page.tsx (#150) — тарифы,
 * Stripe checkout/портал, история платежей.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const plansMock = jest.fn();
const subMock = jest.fn();
const checkoutMock = jest.fn();
const portalMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getBillingPlans: (...args: unknown[]) => plansMock(...args),
    getMySubscription: (...args: unknown[]) => subMock(...args),
    createCheckout: (...args: unknown[]) => checkoutMock(...args),
    createBillingPortalSession: (...args: unknown[]) => portalMock(...args),
  },
}));

import BillingPage from '@/app/(protected)/settings/billing/page';

const plans = [
  {
    id: 'FREE',
    name: 'Free',
    priceCentsMonthly: 0,
    features: ['3 сессии в месяц'],
    role: 'PATIENT',
  },
  {
    id: 'PRO',
    name: 'Pro',
    priceCentsMonthly: 1900,
    features: ['Безлимит сессий'],
    role: 'PATIENT',
  },
  {
    id: 'THERAPIST',
    name: 'Therapist',
    priceCentsMonthly: 4900,
    features: ['Кабинет пациентов'],
    role: 'THERAPIST',
  },
];

const freeSub = { plan: 'FREE', status: 'ACTIVE' };

beforeEach(() => {
  plansMock.mockReset();
  subMock.mockReset();
  checkoutMock.mockReset();
  portalMock.mockReset();
});

describe('BillingPage (#150)', () => {
  it('loading (role=status), потом тарифная сетка', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce(freeSub);
    render(<BillingPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/Загрузка/);
    expect(await screen.findByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Therapist')).toBeInTheDocument();
  });

  it('ошибка загрузки → role=alert', async () => {
    plansMock.mockRejectedValueOnce(new Error('Billing недоступен'));
    subMock.mockRejectedValueOnce(new Error('Billing недоступен'));
    render(<BillingPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Billing недоступен');
  });

  it('текущий план помечен, кнопка «Оформить» на нём не показана', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce(freeSub);
    render(<BillingPage />);

    await screen.findByText('Pro');
    // Бейдж «Текущий план» на карточке FREE (точное совпадение, без шапки)
    expect(screen.getByText('Текущий план', { selector: 'span' })).toBeInTheDocument();
    // Платных планов два → две кнопки «Оформить»
    expect(screen.getAllByRole('button', { name: /оформить/i })).toHaveLength(2);
  });

  it('активная подписка → статус зелёным, PAST_DUE → жёлтым (класс)', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce({ plan: 'PRO', status: 'PAST_DUE' });
    render(<BillingPage />);

    const status = await screen.findByText('PAST_DUE');
    expect(status).toHaveClass('text-amber-600');
  });

  it('checkout: клик «Оформить» → createCheckout(planId)', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce(freeSub);
    checkoutMock.mockReturnValueOnce(new Promise(() => {})); // не редиректим в jsdom
    const user = userEvent.setup();
    render(<BillingPage />);

    const buttons = await screen.findAllByRole('button', { name: /оформить/i });
    await user.click(buttons[0]); // PRO

    expect(checkoutMock).toHaveBeenCalledWith('PRO');
    // busy → кнопки заблокированы
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /переход/i })[0]).toBeDisabled();
    });
  });

  it('checkout упал → role=alert, кнопки снова активны', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce(freeSub);
    checkoutMock.mockRejectedValueOnce(new Error('Stripe не настроен'));
    const user = userEvent.setup();
    render(<BillingPage />);

    const buttons = await screen.findAllByRole('button', { name: /оформить/i });
    await user.click(buttons[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Stripe не настроен');
    expect(screen.getAllByRole('button', { name: /оформить/i })[0]).toBeEnabled();
  });

  it('платная подписка → секция управления + дата списания + Stripe портал', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce({
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: '2026-07-01T00:00:00Z',
      cancelAtPeriodEnd: false,
    });
    render(<BillingPage />);

    expect(await screen.findByText(/Следующее списание/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stripe портал/i })).toBeInTheDocument();
  });

  it('cancelAtPeriodEnd → пометка «(отменится)»', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce({
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: '2026-07-01T00:00:00Z',
      cancelAtPeriodEnd: true,
    });
    render(<BillingPage />);

    expect(await screen.findByText(/\(отменится\)/)).toBeInTheDocument();
  });

  it('FREE-план → секции управления нет', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce(freeSub);
    render(<BillingPage />);

    await screen.findByText('Pro');
    expect(screen.queryByText(/Управление подпиской/)).toBeNull();
  });

  it('портал: клик → createBillingPortalSession, ошибка → alert', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce({ plan: 'PRO', status: 'ACTIVE' });
    portalMock.mockRejectedValueOnce(new Error('500'));
    const user = userEvent.setup();
    render(<BillingPage />);

    await user.click(await screen.findByRole('button', { name: /stripe портал/i }));

    expect(portalMock).toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Не удалось открыть портал/);
  });

  it('история платежей: дата, сумма в долларах, ссылка на счёт', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce({
      plan: 'PRO',
      status: 'ACTIVE',
      invoices: [
        {
          id: 'inv1',
          amountCents: 1900,
          currency: 'usd',
          status: 'paid',
          hostedInvoiceUrl: 'https://stripe.com/inv1',
          paidAt: '2026-06-01T00:00:00Z',
          createdAt: '2026-06-01T00:00:00Z',
        },
      ],
    });
    render(<BillingPage />);

    expect(await screen.findByText(/История платежей/)).toBeInTheDocument();
    expect(screen.getByText('$19.00')).toBeInTheDocument();
    const invoiceLink = screen.getByRole('link', { name: /счёт/i });
    expect(invoiceLink).toHaveAttribute('href', 'https://stripe.com/inv1');
    expect(invoiceLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('без инвойсов секции истории нет', async () => {
    plansMock.mockResolvedValueOnce(plans);
    subMock.mockResolvedValueOnce(freeSub);
    render(<BillingPage />);

    await screen.findByText('Pro');
    expect(screen.queryByText(/История платежей/)).toBeNull();
  });
});
