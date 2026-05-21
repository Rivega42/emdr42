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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Подписка</h1>
        <p className="text-gray-400">Загрузка…</p>
      </div>
    );
  }

  const currentPlanId = subscription?.plan ?? 'FREE';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Подписка и оплата</h1>
        <p className="text-gray-500">
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
                isCurrent ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'
              }`}
            >
              <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
              <div className="text-3xl font-bold text-gray-900 mt-2 mb-4">
                {formatPrice(plan.priceCentsMonthly)}
              </div>
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5" aria-hidden="true">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="block text-center py-2 text-sm text-gray-500 font-semibold">
                  Текущий план
                </span>
              ) : plan.id === 'FREE' ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-md font-semibold cursor-not-allowed"
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
        <section className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Управление подпиской</h2>
          {subscription.currentPeriodEnd && (
            <p className="text-sm text-gray-500 mb-4">
              Следующее списание:{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('ru-RU')}
              {subscription.cancelAtPeriodEnd && ' (отменится)'}
            </p>
          )}
          <button
            onClick={handlePortal}
            disabled={busy}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold transition-colors"
          >
            Открыть Stripe портал
          </button>
        </section>
      )}

      {/* Invoices */}
      {subscription?.invoices && subscription.invoices.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">История платежей</h2>
          <div className="space-y-3 text-sm">
            {subscription.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-gray-900">
                    {new Date(inv.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="text-xs text-gray-400">{inv.status}</div>
                </div>
                <div className="text-gray-900 font-semibold">
                  ${(inv.amountCents / 100).toFixed(2)}
                </div>
                {inv.hostedInvoiceUrl && (
                  <a
                    href={inv.hostedInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Счёт
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 text-sm text-gray-500 text-center">
        <Link href="/settings" className="hover:underline">
          ← Все настройки
        </Link>
      </div>
    </div>
  );
}
