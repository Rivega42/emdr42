'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { registerSchema, sanitizeNextPath, type RegisterInput } from '@/lib/schemas/auth';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Invite-flow (/invite/[token] → register?next=/invite/...) должен вернуть
  // пользователя на принятие приглашения, а не выкидывать на dashboard.
  const next = sanitizeNextPath(searchParams.get('next'));
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
      router.push(next);
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
  // Приглушённые состояния дизайн-системы: тревожных красных полос не бывает
  const strengthColor = ['bg-danger', 'bg-danger', 'bg-attention', 'bg-ok', 'bg-accent'][passwordStrength];

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" aria-label="EMDR-AI home">
            <span className="auth-mark" aria-hidden="true"></span>
            <h1 className="text-3xl text-ink">EMDR-AI</h1>
          </Link>
        </div>

        <div className="e-card">
          <h2 className="text-2xl text-ink mb-6 text-center">Создать аккаунт</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="e-field">
              <label htmlFor="name" className="e-field__label">Имя</label>
              <input
                id="name"
                autoComplete="name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...register('name')}
                className={`e-input ${errors.name ? 'e-input--error' : ''}`}
                placeholder="Ваше имя"
              />
              {errors.name && <p id="name-error" role="alert" className="e-field__error">{errors.name.message}</p>}
            </div>

            <div className="e-field">
              <label htmlFor="email" className="e-field__label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className={`e-input ${errors.email ? 'e-input--error' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && <p id="email-error" role="alert" className="e-field__error">{errors.email.message}</p>}
            </div>

            <div className="e-field">
              <label htmlFor="password" className="e-field__label">Пароль</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby="password-help password-error"
                {...register('password')}
                className={`e-input ${errors.password ? 'e-input--error' : ''}`}
                placeholder="••••••••"
              />
              <p id="password-help" className="e-field__hint">
                Минимум 12 символов. Заглавные + строчные + цифры + спецсимволы.
              </p>
              {password && (
                <div className="mt-2 flex gap-1 items-center" aria-hidden="true">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${i < passwordStrength ? strengthColor : 'bg-surface-2'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-ink-muted w-20 text-right">{strengthLabel}</span>
                </div>
              )}
              {errors.password && <p id="password-error" role="alert" className="e-field__error">{errors.password.message}</p>}
            </div>

            <div className="e-field">
              <label htmlFor="passwordConfirm" className="e-field__label">Подтверждение</label>
              <input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.passwordConfirm ? 'true' : 'false'}
                {...register('passwordConfirm')}
                className={`e-input ${errors.passwordConfirm ? 'e-input--error' : ''}`}
                placeholder="••••••••"
              />
              {errors.passwordConfirm && (
                <p role="alert" className="e-field__error">{errors.passwordConfirm.message}</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                {...register('tosAccepted')}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>
                Я принимаю{' '}
                <Link href="/legal/terms" className="text-accent hover:underline" target="_blank">
                  Terms of Service
                </Link>{' '}
                и{' '}
                <Link href="/legal/privacy" className="text-accent hover:underline" target="_blank">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.tosAccepted && (
              <p role="alert" className="e-field__error">{errors.tosAccepted.message}</p>
            )}

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
              {isSubmitting ? 'Создаём аккаунт...' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="mt-6 text-center text-ink-muted text-sm">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-accent hover:underline">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
