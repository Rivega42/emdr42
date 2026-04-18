'use client';

import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Оплата отменена</h1>
        <p className="text-gray-500 mb-6">
          Вы не завершили оплату. Возвращайтесь когда будете готовы —
          бесплатный план всегда доступен.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/settings/billing"
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold"
          >
            Вернуться к тарифам
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
