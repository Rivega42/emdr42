'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error) — подключить после #87
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Что-то пошло не так</h1>
          <p className="text-gray-500">
            Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 font-mono">ID ошибки: {error.digest}</p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
