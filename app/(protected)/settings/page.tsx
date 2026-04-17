'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const SettingToggle: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between">
    <div>
      <div className="text-gray-900 font-semibold">{label}</div>
      <div className="text-gray-400 text-sm">{description}</div>
    </div>
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-gray-900' : 'bg-gray-200'
      }`}
    >
      <div
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

interface AppSettings {
  notifications: { email: boolean; push: boolean; sms: boolean };
  therapy: { adaptiveMode: boolean; binauralBeats: boolean; soundEffects: boolean };
  privacy: { anonymousAnalytics: boolean };
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: { email: true, push: false, sms: false },
  therapy: { adaptiveMode: true, binauralBeats: false, soundEffects: true },
  privacy: { anonymousAnalytics: false },
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const updateSetting = <K extends keyof AppSettings>(
    category: K,
    key: keyof AppSettings[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: !prev[category][key] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      // API endpoint PATCH /users/me ожидает { name, settings: JSON }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
        body: JSON.stringify({ name, settings }),
      });
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/users/me/export`;
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Данные будут удалены через 30 дней (можно отменить).')) return;
    setDeleting(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });
      logout();
      router.push('/');
    } catch {
      alert('Не удалось запросить удаление. Попробуйте позже.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Настройки</h1>

      {/* Profile */}
      <section className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Профиль</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-gray-500 text-sm mb-2">Имя</label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="email-field" className="block text-gray-500 text-sm mb-2">Email</label>
            <input
              id="email-field"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Для смены email свяжитесь с поддержкой
            </p>
          </div>
        </div>
      </section>

      {/* Therapy */}
      <section className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Настройки терапии</h2>
        <div className="space-y-4">
          <SettingToggle
            label="Адаптивный режим"
            description="ИИ подстраивает паттерн и скорость под ваше эмоциональное состояние"
            enabled={settings.therapy.adaptiveMode}
            onToggle={() => updateSetting('therapy', 'adaptiveMode')}
          />
          <SettingToggle
            label="Билатеральное аудио"
            description="Звуковые частоты для усиления терапевтического эффекта"
            enabled={settings.therapy.binauralBeats}
            onToggle={() => updateSetting('therapy', 'binauralBeats')}
          />
          <SettingToggle
            label="Звуковые эффекты"
            description="Фоновые звуки во время сессий"
            enabled={settings.therapy.soundEffects}
            onToggle={() => updateSetting('therapy', 'soundEffects')}
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Уведомления</h2>
        <div className="space-y-4">
          <SettingToggle
            label="Email"
            description="Напоминания о сессиях и еженедельный отчёт"
            enabled={settings.notifications.email}
            onToggle={() => updateSetting('notifications', 'email')}
          />
          <SettingToggle
            label="Push"
            description="Браузерные уведомления"
            enabled={settings.notifications.push}
            onToggle={() => updateSetting('notifications', 'push')}
          />
          <SettingToggle
            label="SMS"
            description="Только для экстренных уведомлений (нужна верификация телефона)"
            enabled={settings.notifications.sms}
            onToggle={() => updateSetting('notifications', 'sms')}
          />
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Приватность и данные</h2>
        <div className="space-y-4">
          <SettingToggle
            label="Анонимная аналитика"
            description="Помогает улучшать платформу. Персональные данные не передаются."
            enabled={settings.privacy.anonymousAnalytics}
            onToggle={() => updateSetting('privacy', 'anonymousAnalytics')}
          />
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <button
              onClick={handleExport}
              className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md"
            >
              <div className="font-semibold text-gray-900">Скачать свои данные</div>
              <div className="text-sm text-gray-500">
                GDPR Art. 15 — полный экспорт в JSON
              </div>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="block w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md disabled:opacity-60"
            >
              <div className="font-semibold text-red-700">
                {deleting ? 'Запрашиваем удаление…' : 'Удалить аккаунт'}
              </div>
              <div className="text-sm text-red-500">
                GDPR Art. 17 — 30-дневный grace period, можно отменить
              </div>
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-end items-center gap-4">
        {status === 'saved' && (
          <span role="status" className="text-sm text-green-600">Сохранено</span>
        )}
        {status === 'error' && (
          <span role="alert" className="text-sm text-red-600">Ошибка сохранения</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
