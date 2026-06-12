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
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="e-card w-full max-w-md text-center">
          <h2 className="text-xl text-ink mb-3">Ссылка недействительна</h2>
          <p className="text-ink-muted text-sm mb-6">
            Ссылка для сброса пароля устарела или некорректна.
          </p>
          <Link href="/forgot-password" className="e-btn e-btn--primary e-btn--md">
            Запросить новую
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="e-card w-full max-w-md">
        {success ? (
          <div className="text-center space-y-4" role="status">
            <h2 className="text-2xl text-ink">Пароль изменён</h2>
            <p className="text-ink-muted text-sm">Перенаправляем на страницу входа…</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl text-ink mb-6 text-center">Новый пароль</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <input type="hidden" {...register('token')} />

              <div className="e-field">
                <label htmlFor="password" className="e-field__label">
                  Новый пароль
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby="password-help password-error"
                  {...register('password')}
                  className={`e-input ${errors.password ? 'e-input--error' : ''}`}
                />
                <p id="password-help" className="e-field__hint">
                  Минимум 12 символов. Заглавные + строчные + цифры + спецсимволы.
                </p>
                {errors.password && <p id="password-error" role="alert" className="e-field__error">{errors.password.message}</p>}
              </div>

              <div className="e-field">
                <label htmlFor="passwordConfirm" className="e-field__label">
                  Подтверждение
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.passwordConfirm ? 'true' : 'false'}
                  {...register('passwordConfirm')}
                  className={`e-input ${errors.passwordConfirm ? 'e-input--error' : ''}`}
                />
                {errors.passwordConfirm && <p role="alert" className="e-field__error">{errors.passwordConfirm.message}</p>}
              </div>

              {apiError && (
                <div role="alert" className="p-3 bg-danger-soft border border-danger rounded-md text-danger text-sm">
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="e-btn e-btn--primary e-btn--md w-full"
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
