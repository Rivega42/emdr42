'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/schemas/auth';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await api.forgotPassword(data.email);
    } catch {
      // Privacy — показываем успех в любом случае (mitigate enumeration)
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" aria-label="EMDR-AI home">
            <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <span className="text-white text-4xl">🧠</span>
            </div>
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          {submitted ? (
            <div className="text-center space-y-4" role="status">
              <h2 className="text-2xl font-bold text-gray-900">Проверьте email</h2>
              <p className="text-gray-600 text-sm">
                Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.
                Проверьте папку со спамом.
              </p>
              <Link href="/login" className="inline-block text-gray-900 hover:underline">
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Сброс пароля</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-gray-500 text-sm mb-2">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={errors.email ? 'true' : 'false'}
                    {...register('email')}
                    className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                      errors.email ? 'border-red-400' : 'border-gray-300 focus:border-gray-900'
                    }`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Отправляем...' : 'Отправить ссылку'}
                </button>
              </form>
              <p className="mt-6 text-center text-gray-400 text-sm">
                <Link href="/login" className="text-gray-900 hover:underline">Назад ко входу</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
