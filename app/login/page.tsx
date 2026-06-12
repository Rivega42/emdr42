'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, MfaRequiredError } from '@/contexts/AuthContext';
import { loginSchema, sanitizeNextPath, type LoginInput } from '@/lib/schemas/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get('next'));
  const { login, completeMfa } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  // MFA-step 2: если backend требует TOTP — храним mfaToken и показываем форму кода.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

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
      if (err instanceof MfaRequiredError) {
        setMfaToken(err.mfaToken);
        return;
      }
      setApiError(
        err instanceof Error ? err.message : 'Неверный email или пароль',
      );
    }
  };

  const onSubmitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || !mfaCode) return;
    setApiError(null);
    setMfaSubmitting(true);
    try {
      await completeMfa(mfaToken, mfaCode);
      router.push(next);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Неверный код MFA',
      );
    } finally {
      setMfaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" aria-label="EMDR-AI home">
            <span className="auth-mark" aria-hidden="true"></span>
            <h1 className="text-3xl text-ink">EMDR-AI</h1>
          </Link>
        </div>

        <div className="e-card">
          <h2 className="text-2xl text-ink mb-6 text-center">
            {mfaToken ? 'Двухфакторная аутентификация' : 'Вход'}
          </h2>

          {mfaToken && (
            <form onSubmit={onSubmitMfa} className="space-y-4" noValidate>
              <div className="e-field">
                <label htmlFor="mfa-code" className="e-field__label">
                  Код из приложения (6 цифр) или backup-код
                </label>
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.trim())}
                  className="e-input"
                  placeholder="000000"
                />
              </div>
              {apiError && (
                <div role="alert" className="p-3 bg-danger-soft border border-danger rounded-md text-danger text-sm">
                  {apiError}
                </div>
              )}
              <button
                type="submit"
                disabled={mfaSubmitting || !mfaCode}
                className="e-btn e-btn--primary e-btn--md w-full"
              >
                {mfaSubmitting ? 'Проверяем...' : 'Подтвердить'}
              </button>
              <button
                type="button"
                onClick={() => { setMfaToken(null); setMfaCode(''); setApiError(null); }}
                className="w-full text-sm text-ink-muted hover:text-ink"
              >
                ← Начать заново
              </button>
            </form>
          )}

          {!mfaToken && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="e-field">
              <label htmlFor="email" className="e-field__label">
                Email
              </label>
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
              {errors.email && (
                <p id="email-error" role="alert" className="e-field__error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="e-field">
              <label htmlFor="password" className="e-field__label">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
                className={`e-input ${errors.password ? 'e-input--error' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p id="password-error" role="alert" className="e-field__error">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-accent text-sm hover:underline">
                Забыли пароль?
              </Link>
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
              {isSubmitting ? 'Входим...' : 'Войти'}
            </button>
          </form>
          )}

          {!mfaToken && (
          <p className="mt-8 text-center text-ink-muted text-sm">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-accent hover:underline">
              Зарегистрироваться
            </Link>
          </p>
          )}
        </div>
      </div>
    </div>
  );
}
