'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface InvitePreview {
  therapistName: string;
  expiresAt: string;
  requiresEmail: string | null;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = String(params?.token ?? '');
  const { user, loading } = useAuth();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .previewPatientInvite(token)
      .then(setPreview)
      .catch((err) => {
        setPreviewError(
          err instanceof Error
            ? err.message
            : 'Не удалось загрузить приглашение',
        );
      });
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      // Не залогинен — редирект на регистрацию с next=
      router.push(
        `/register?next=${encodeURIComponent(`/invite/${token}`)}${
          preview?.requiresEmail ? `&email=${encodeURIComponent(preview.requiresEmail)}` : ''
        }`,
      );
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      await api.acceptPatientInvite(token);
      setAccepted(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setAcceptError(
        err instanceof Error ? err.message : 'Не удалось принять приглашение',
      );
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Приглашение</h1>

        {/* Loading state */}
        {!preview && !previewError && (
          <p className="text-gray-500" role="status" aria-live="polite">
            Загрузка…
          </p>
        )}

        {/* Preview error */}
        {previewError && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {previewError}
            <Link href="/" className="block mt-3 text-gray-900 hover:underline">
              ← На главную
            </Link>
          </div>
        )}

        {/* Already accepted */}
        {accepted && (
          <div role="status" className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
            ✓ Приглашение принято. Перенаправляем в кабинет…
          </div>
        )}

        {/* Valid invite — show prompt */}
        {preview && !accepted && (
          <>
            <p className="text-gray-700 mb-4">
              <span className="font-semibold">{preview.therapistName}</span>{' '}
              приглашает вас стать пациентом на платформе EMDR-AI.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Срок действия: до{' '}
              {new Date(preview.expiresAt).toLocaleDateString('ru-RU')}.
              {preview.requiresEmail && (
                <>
                  {' '}
                  Приглашение привязано к email{' '}
                  <strong>{preview.requiresEmail}</strong>.
                </>
              )}
            </p>

            {acceptError && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {acceptError}
              </div>
            )}

            {loading ? (
              <p className="text-gray-500">…</p>
            ) : user ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
              >
                {accepting ? 'Принимаем…' : 'Принять приглашение'}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleAccept}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors"
                >
                  Зарегистрироваться и принять
                </button>
                <Link
                  href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                  className="block text-center text-sm text-gray-500 hover:text-gray-900"
                >
                  Уже есть аккаунт? Войти
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
