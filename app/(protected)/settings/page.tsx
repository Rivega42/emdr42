'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n, LOCALE_LABELS } from '@/lib/i18n';
import { api } from '@/lib/api';

const SettingToggle: React.FC<{ label: string; description: string; enabled: boolean; onToggle: () => void }> = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between">
    <div>
      <div className="text-gray-900 font-semibold">{label}</div>
      <div className="text-gray-400 text-sm">{description}</div>
    </div>
    <button onClick={onToggle} className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-gray-900' : 'bg-gray-200'}`}>
      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

export default function SettingsPage() {
  const { user } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    emailReminders: true,
    soundEffects: true,
    binauralBeats: false,
    adaptiveMode: true,
    dataCollection: false,
  });

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (token) api.setToken(token);
      await api.updateProfile({ name, settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  }, [name, settings]);

  const handleExport = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) api.setToken(token);
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emdr42-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Handle error
    }
  }, []);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (token) api.setToken(token);
      await api.deleteMyData();
      setShowDeleteConfirm(false);
    } catch {
      // Handle error
    } finally {
      setDeleting(false);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">{t('settings.title')}</h1>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700 text-sm">
          {t('settings.saved')}
        </div>
      )}

      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.profile')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-500 text-sm mb-2">{t('settings.displayName')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-gray-900 transition-colors" />
          </div>
          <div>
            <label className="block text-gray-500 text-sm mb-2">{t('settings.emailAddress')}</label>
            <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md text-gray-400 cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.language')}</h2>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as any)}
          className="w-full max-w-xs px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
        >
          {Object.entries(LOCALE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      {/* Therapy Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.therapyPreferences')}</h2>
        <div className="space-y-4">
          <SettingToggle label={t('settings.adaptiveMode')} description="AI adjusts patterns based on your emotional state" enabled={settings.adaptiveMode} onToggle={() => handleToggle('adaptiveMode')} />
          <SettingToggle label={t('settings.binauralBeats')} description="Enable therapeutic sound frequencies" enabled={settings.binauralBeats} onToggle={() => handleToggle('binauralBeats')} />
          <SettingToggle label={t('settings.soundEffects')} description="Play ambient sounds during sessions" enabled={settings.soundEffects} onToggle={() => handleToggle('soundEffects')} />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.notifications')}</h2>
        <div className="space-y-4">
          <SettingToggle label={t('settings.pushNotifications')} description="Receive session reminders" enabled={settings.notifications} onToggle={() => handleToggle('notifications')} />
          <SettingToggle label={t('settings.emailReminders')} description="Get weekly progress reports" enabled={settings.emailReminders} onToggle={() => handleToggle('emailReminders')} />
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.privacy')}</h2>
        <div className="space-y-4">
          <SettingToggle label={t('settings.anonymousAnalytics')} description="Help improve the app with anonymous usage data" enabled={settings.dataCollection} onToggle={() => handleToggle('dataCollection')} />
          <div className="flex gap-3 pt-2">
            <button onClick={handleExport} className="px-6 py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors">
              {t('settings.exportData')}
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
              {t('settings.deleteAllData')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-lg p-8 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('settings.deleteAllData')}</h3>
            <p className="text-gray-500 mb-6">{t('settings.deleteConfirm')}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">{t('common.cancel')}</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                {deleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50">
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
