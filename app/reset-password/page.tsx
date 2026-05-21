'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/schemas/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: tokenFromUrl },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setApiError(null);
    try {
      await api.resetPassword(data.token, data.password);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Не удалось сбросить пароль. Запросите новую ссылку.',
      );
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Ссылка недействительна</h2>
          <p className="text-gray-600 text-sm mb-6">
            Ссылка для сброса пароля устарела или некорректна.
          </p>
          <Link href="/forgot-password" className="inline-block px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold">
            Запросить новую
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8">
        {success ? (
          <div className="text-center space-y-4" role="status">
            <h2 className="text-2xl font-bold text-gray-900">Пароль изменён</h2>
            <p className="text-gray-600 text-sm">Перенаправляем на страницу входа…</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Новый пароль</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <input type="hidden" {...register('token')} />

              <div>
                <label htmlFor="password" className="block text-gray-500 text-sm mb-2">
                  Новый пароль
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby="password-help password-error"
                  {...register('password')}
                  className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 focus:outline-none transition-colors ${
                    errors.password ? 'border-red-400' : 'border-gray-300 focus:border-gray-900'
                  }`}
                />
                <p id="password-help" className="mt-1 text-xs text-gray-400">
                  Минимум 12 символов. Заглавные + строчные + цифры + спецсимволы.
                </p>
                {errors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="passwordConfirm" className="block text-gray-500 text-sm mb-2">
                  Подтверждение
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.passwordConfirm ? 'true' : 'false'}
                  {...register('passwordConfirm')}
                  className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 focus:outline-none transition-colors ${
                    errors.passwordConfirm ? 'border-red-400' : 'border-gray-300 focus:border-gray-900'
                  }`}
                />
                {errors.passwordConfirm && <p role="alert" className="mt-1 text-xs text-red-600">{errors.passwordConfirm.message}</p>}
              </div>

              {apiError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Сохраняем...' : 'Изменить пароль'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
