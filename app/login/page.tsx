'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      router.push(next);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Неверный email или пароль',
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Вход</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-gray-500 text-sm mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                  errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-gray-900'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-500 text-sm mb-2">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
                className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 focus:outline-none transition-colors ${
                  errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-gray-900'
                }`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-gray-900 text-sm hover:underline">
                Забыли пароль?
              </Link>
            </div>

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
              {isSubmitting ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-sm">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-gray-900 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
