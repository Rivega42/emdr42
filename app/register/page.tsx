'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { registerSchema, type RegisterInput } from '@/lib/schemas/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tosAccepted: false },
  });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterInput) => {
    setApiError(null);
    try {
      await registerUser(data.name, data.email, data.password);
      router.push('/dashboard');
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Не удалось создать аккаунт',
      );
    }
  };

  // Простая оценка сложности пароля (0-4)
  const passwordStrength = (() => {
    let score = 0;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный'][passwordStrength];
  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-500', 'bg-green-500'][passwordStrength];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" aria-label="EMDR-AI home">
            <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <span className="text-white text-4xl">🧠</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">EMDR-AI</h1>
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Создать аккаунт</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="block text-gray-500 text-sm mb-2">Имя</label>
              <input
                id="name"
                autoComplete="name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...register('name')}
                className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                  errors.name ? 'border-red-400' : 'border-gray-300 focus:border-gray-900'
                }`}
                placeholder="Ваше имя"
              />
              {errors.name && <p id="name-error" role="alert" className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-gray-500 text-sm mb-2">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                  errors.email ? 'border-red-400' : 'border-gray-300 focus:border-gray-900'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-500 text-sm mb-2">Пароль</label>
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
                placeholder="••••••••"
              />
              <p id="password-help" className="mt-1 text-xs text-gray-400">
                Минимум 12 символов. Заглавные + строчные + цифры + спецсимволы.
              </p>
              {password && (
                <div className="mt-2 flex gap-1 items-center" aria-hidden="true">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${i < passwordStrength ? strengthColor : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 w-20 text-right">{strengthLabel}</span>
                </div>
              )}
              {errors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-gray-500 text-sm mb-2">Подтверждение</label>
              <input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.passwordConfirm ? 'true' : 'false'}
                {...register('passwordConfirm')}
                className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 focus:outline-none transition-colors ${
                  errors.passwordConfirm ? 'border-red-400' : 'border-gray-300 focus:border-gray-900'
                }`}
                placeholder="••••••••"
              />
              {errors.passwordConfirm && (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.passwordConfirm.message}</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                {...register('tosAccepted')}
                className="mt-1"
              />
              <span>
                Я принимаю{' '}
                <Link href="/legal/terms" className="text-gray-900 hover:underline" target="_blank">
                  Terms of Service
                </Link>{' '}
                и{' '}
                <Link href="/legal/privacy" className="text-gray-900 hover:underline" target="_blank">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.tosAccepted && (
              <p role="alert" className="text-xs text-red-600">{errors.tosAccepted.message}</p>
            )}

            {apiError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Создаём аккаунт...' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-gray-900 hover:underline">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
