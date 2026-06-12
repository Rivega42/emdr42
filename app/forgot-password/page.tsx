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
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" aria-label="EMDR-AI home">
            <span className="auth-mark" aria-hidden="true"></span>
          </Link>
        </div>
        <div className="e-card">
          {submitted ? (
            <div className="text-center space-y-4" role="status">
              <h2 className="text-2xl text-ink">Проверьте email</h2>
              <p className="text-ink-muted text-sm">
                Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.
                Проверьте папку со спамом.
              </p>
              <Link href="/login" className="inline-block text-accent hover:underline">
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl text-ink mb-6 text-center">Сброс пароля</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="e-field">
                  <label htmlFor="email" className="e-field__label">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={errors.email ? 'true' : 'false'}
                    {...register('email')}
                    className={`e-input ${errors.email ? 'e-input--error' : ''}`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p role="alert" className="e-field__error">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="e-btn e-btn--primary e-btn--md w-full"
                >
                  {isSubmitting ? 'Отправляем...' : 'Отправить ссылку'}
                </button>
              </form>
              <p className="mt-6 text-center text-ink-muted text-sm">
                <Link href="/login" className="text-accent hover:underline">Назад ко входу</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
