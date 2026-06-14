'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';

interface Plan {
  id: string;
  name: string;
  priceCentsMonthly: number;
  features: string[];
  role: string;
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  invoices?: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    hostedInvoiceUrl?: string | null;
    paidAt?: string | null;
    createdAt: string;
  }>;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([api.getBillingPlans(), api.getMySubscription()]);
        setPlans(p);
        setSubscription(s);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить billing');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCheckout = async (planId: string) => {
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.createCheckout(planId);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось создать checkout. Возможно billing ещё не настроен.',
      );
      setBusy(false);
    }
  };

  const handlePortal = async () => {
    setBusy(true);
    try {
      const { portalUrl } = await api.createBillingPortalSession();
      window.location.href = portalUrl;
    } catch {
      setError('Не удалось открыть портал');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto" role="status">
        <h1 className="text-4xl font-bold text-ink mb-2">Подписка</h1>
        <p className="text-ink-muted">Загрузка…</p>
      </div>
    );
  }

  const currentPlanId = subscription?.plan ?? 'FREE';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-ink mb-2">Подписка и оплата</h1>
        <p className="text-ink-muted">
          Текущий план: <strong>{currentPlanId}</strong> · Статус:{' '}
          <span
            className={
              subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
                ? 'text-green-600'
                : 'text-amber-600'
            }
          >
            {subscription?.status ?? 'ACTIVE'}
          </span>
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Plans grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 ${
                isCurrent ? 'border-gray-900 bg-surface-2' : 'border-line bg-surface'
              }`}
            >
              <h2 className="text-lg font-bold text-ink">{plan.name}</h2>
              <div className="text-3xl font-bold text-ink mt-2 mb-4">
                {formatPrice(plan.priceCentsMonthly)}
              </div>
              <ul className="space-y-2 mb-6 text-sm text-ink-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5" aria-hidden="true">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="block text-center py-2 text-sm text-ink-muted font-semibold">
                  Текущий план
                </span>
              ) : plan.id === 'FREE' ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-surface-2 text-ink-muted rounded-md font-semibold cursor-not-allowed"
                >
                  Бесплатно
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={busy}
                  className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors disabled:opacity-50"
                >
                  {busy ? 'Переход…' : 'Оформить'}
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* Manage subscription */}
      {subscription && subscription.plan !== 'FREE' && (
        <section className="mb-8 bg-surface border border-line rounded-lg p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Управление подпиской</h2>
          {subscription.currentPeriodEnd && (
            <p className="text-sm text-ink-muted mb-4">
              Следующее списание:{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('ru-RU')}
              {subscription.cancelAtPeriodEnd && ' (отменится)'}
            </p>
          )}
          <button
            onClick={handlePortal}
            disabled={busy}
            className="px-5 py-2.5 bg-surface-2 hover:bg-gray-200 text-ink rounded-md font-semibold transition-colors"
          >
            Открыть Stripe портал
          </button>
        </section>
      )}

      {/* Invoices */}
      {subscription?.invoices && subscription.invoices.length > 0 && (
        <section className="bg-surface border border-line rounded-lg p-6">
          <h2 className="text-lg font-bold text-ink mb-4">История платежей</h2>
          <div className="space-y-3 text-sm">
            {subscription.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 border-b border-line last:border-0"
              >
                <div>
                  <div className="text-ink">
                    {new Date(inv.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="text-xs text-ink-muted">{inv.status}</div>
                </div>
                <div className="text-ink font-semibold">
                  ${(inv.amountCents / 100).toFixed(2)}
                </div>
                {inv.hostedInvoiceUrl && (
                  <a
                    href={inv.hostedInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-muted hover:underline"
                  >
                    Счёт
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 text-sm text-ink-muted text-center">
        <Link href="/settings" className="hover:underline">
          ← Все настройки
        </Link>
      </div>
    </div>
  );
}
