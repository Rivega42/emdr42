'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';

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
      await api.updateProfile({ name, settings });
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportMyData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emdr42-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Не удалось скачать данные.');
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Вы уверены, что хотите удалить аккаунт? Данные будут удалены через 30 дней (можно отменить).',
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await api.requestAccountDeletion();
      logout();
      router.push('/');
    } catch {
      alert('Не удалось запросить удаление. Попробуйте позже.');
      setDeleting(false);
    }
  };

  return (
    <>
      <div>
        <h1 className="c-h1">Настройки</h1>
        <p className="c-sub">Профиль, терапия, уведомления и ваши данные</p>
      </div>

      {/* Профиль */}
      <div className="c-panel">
        <h2 className="c-panel__title">Профиль</h2>
        <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 480 }}>
          <div className="e-field">
            <label htmlFor="display-name" className="e-field__label">Имя</label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="e-input"
            />
          </div>
          <div className="e-field">
            <label htmlFor="email-field" className="e-field__label">Email</label>
            <input id="email-field" type="email" value={user?.email ?? ''} disabled className="e-input" />
            <p className="e-field__hint">Для смены email свяжитесь с поддержкой</p>
          </div>
        </div>
      </div>

      {/* Настройки терапии */}
      <div className="c-panel">
        <h2 className="c-panel__title">Настройки терапии</h2>
        <Switch
          label="Адаптивный режим"
          description="ИИ подстраивает паттерн и скорость под ваше эмоциональное состояние"
          checked={settings.therapy.adaptiveMode}
          onChange={() => updateSetting('therapy', 'adaptiveMode')}
        />
        <Switch
          label="Билатеральное аудио"
          description="Звуковые частоты для усиления терапевтического эффекта"
          checked={settings.therapy.binauralBeats}
          onChange={() => updateSetting('therapy', 'binauralBeats')}
        />
        <Switch
          label="Звуковые эффекты"
          description="Фоновые звуки во время сессий"
          checked={settings.therapy.soundEffects}
          onChange={() => updateSetting('therapy', 'soundEffects')}
        />
      </div>

      {/* Уведомления */}
      <div className="c-panel">
        <h2 className="c-panel__title">Уведомления</h2>
        <Switch
          label="Email"
          description="Напоминания о сессиях и еженедельный отчёт"
          checked={settings.notifications.email}
          onChange={() => updateSetting('notifications', 'email')}
        />
        <Switch
          label="Push"
          description="Браузерные уведомления"
          checked={settings.notifications.push}
          onChange={() => updateSetting('notifications', 'push')}
        />
        <Switch
          label="SMS"
          description="Только для экстренных уведомлений (нужна верификация телефона)"
          checked={settings.notifications.sms}
          onChange={() => updateSetting('notifications', 'sms')}
        />
      </div>

      {/* Приватность и данные */}
      <div className="c-panel">
        <h2 className="c-panel__title">Приватность и данные</h2>
        <Switch
          label="Анонимная аналитика"
          description="Помогает улучшать платформу. Персональные данные не передаются."
          checked={settings.privacy.anonymousAnalytics}
          onChange={() => updateSetting('privacy', 'anonymousAnalytics')}
        />
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={handleExport}>
            <Icon name="download" size={16} /> Скачать свои данные
          </Button>
          <p className="c-sub" style={{ marginTop: 'var(--space-2)' }}>GDPR Art. 15 — полный экспорт в JSON</p>
        </div>
      </div>

      {/* Danger-зона */}
      <div className="c-danger">
        <h2 className="c-danger__title">Удаление аккаунта</h2>
        <p className="c-danger__text">
          GDPR Art. 17 — данные будут удалены через 30 дней. В течение этого срока удаление можно отменить, написав в поддержку.
        </p>
        <Button variant="danger" disabled={deleting} onClick={handleDelete}>
          {deleting ? 'Запрашиваем удаление…' : 'Удалить аккаунт'}
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-4)' }}>
        {status === 'saved' && (
          <span role="status" className="text-sm" style={{ color: 'var(--success)' }}>Сохранено</span>
        )}
        {status === 'error' && (
          <span role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>Ошибка сохранения</span>
        )}
        <Button variant="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </div>
    </>
  );
}
