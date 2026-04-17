import Link from 'next/link';
import type { Metadata } from 'next';
import { ReloadButton } from './ReloadButton';

export const metadata: Metadata = {
  title: 'Офлайн-режим | EMDR-AI',
  description: 'Нет подключения к интернету. BLS-режим остаётся доступен.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 mx-auto bg-amber-50 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Нет подключения</h1>
          <p className="text-gray-500">
            Подключение к интернету недоступно. AI-диалог и синхронизация временно не работают.
          </p>
          <p className="text-gray-500">
            BLS-визуализация остаётся доступной в локальном режиме.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/session"
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors"
          >
            BLS офлайн
          </Link>
          <ReloadButton />
        </div>
      </div>
    </div>
  );
}
