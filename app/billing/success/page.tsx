'use client';

import Link from 'next/link';

export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Подписка активирована</h1>
        <p className="text-gray-500 mb-6">
          Спасибо! Через несколько секунд план обновится. Можете начинать сессию.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold"
          >
            На Dashboard
          </Link>
          <Link
            href="/settings/billing"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold"
          >
            Настройки билинга
          </Link>
        </div>
      </div>
    </div>
  );
}
