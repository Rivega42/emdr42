import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Страница не найдена | EMDR-AI',
  description: 'Запрошенная страница не существует или была перемещена.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-6xl font-bold text-gray-900">404</p>
          <h1 className="text-2xl font-semibold text-gray-900">Страница не найдена</h1>
          <p className="text-gray-500">
            Запрошенная страница не существует или была перемещена.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors"
          >
            На главную
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold transition-colors"
          >
            Панель управления
          </Link>
        </div>
      </div>
    </div>
  );
}
