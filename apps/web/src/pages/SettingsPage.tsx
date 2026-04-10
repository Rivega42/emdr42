import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

interface TherapyPreferences {
  adaptiveMode: boolean;
  binauralBeats: boolean;
  soundEffects: boolean;
  notifications: boolean;
  emailReminders: boolean;
  dataCollection: boolean;
}

const PREFS_KEY = 'emdr42_therapy_preferences';

const loadPreferences = (): TherapyPreferences => {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return {
    adaptiveMode: true,
    binauralBeats: false,
    soundEffects: true,
    notifications: true,
    emailReminders: true,
    dataCollection: false,
  };
};

// --- Success toast ---
const Toast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <div
    className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
    }`}
  >
    <div className="px-6 py-3 bg-green-500/90 text-white font-medium rounded-full shadow-lg">
      {message}
    </div>
  </div>
);

// --- Delete confirmation modal ---
const DeleteModal: React.FC<{
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}> = ({ open, onConfirm, onCancel, deleting }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-2">Delete All Data</h3>
        <p className="text-white/60 mb-6">
          This will permanently delete all your session data and cannot be undone. Are you sure?
        </p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-6 py-3 bg-red-500/80 text-white rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Everything'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [prefs, setPrefs] = useState<TherapyPreferences>(loadPreferences);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }, []);

  useEffect(() => {
    api
      .getProfile()
      .then(user => {
        setName(user.name || '');
        setEmail(user.email || '');
      })
      .catch(() => {
        // If API unavailable, try to load from localStorage (AuthContext stores user)
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const u = JSON.parse(storedUser);
            setName(u.name || '');
            setEmail(u.email || '');
          }
        } catch {
          // ignore
        }
      })
      .finally(() => setProfileLoading(false));
  }, []);

  const handleToggle = (key: keyof TherapyPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save preferences to localStorage
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

      // Try to save profile to API
      try {
        await api.updateProfile({ name, email });
      } catch {
        // API unavailable -- profile saved locally only
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          localStorage.setItem('user', JSON.stringify({ ...u, name, email }));
        }
      }
      showToast('Settings saved successfully');
    } catch {
      showToast('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await api.deleteAllData();
      showToast('All data deleted');
    } catch {
      showToast('Failed to delete data');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <Toast message={toastMessage} visible={toastVisible} />
      <DeleteModal
        open={deleteModalOpen}
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteModalOpen(false)}
        deleting={deleting}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-white mb-8">Settings</h1>

          {/* Profile Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Profile</h2>
            {profileLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse bg-white/5 rounded-xl h-12" />
                <div className="animate-pulse bg-white/5 rounded-xl h-12" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Display Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                    placeholder="john@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Therapy Preferences */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Therapy Preferences</h2>
            <div className="space-y-4">
              <SettingToggle
                label="Adaptive Mode"
                description="AI adjusts patterns based on your emotional state"
                enabled={prefs.adaptiveMode}
                onToggle={() => handleToggle('adaptiveMode')}
              />
              <SettingToggle
                label="Binaural Beats"
                description="Enable therapeutic sound frequencies"
                enabled={prefs.binauralBeats}
                onToggle={() => handleToggle('binauralBeats')}
              />
              <SettingToggle
                label="Sound Effects"
                description="Play ambient sounds during sessions"
                enabled={prefs.soundEffects}
                onToggle={() => handleToggle('soundEffects')}
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>
            <div className="space-y-4">
              <SettingToggle
                label="Push Notifications"
                description="Receive session reminders"
                enabled={prefs.notifications}
                onToggle={() => handleToggle('notifications')}
              />
              <SettingToggle
                label="Email Reminders"
                description="Get weekly progress reports"
                enabled={prefs.emailReminders}
                onToggle={() => handleToggle('emailReminders')}
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Privacy</h2>
            <div className="space-y-4">
              <SettingToggle
                label="Anonymous Analytics"
                description="Help improve the app with anonymous usage data"
                enabled={prefs.dataCollection}
                onToggle={() => handleToggle('dataCollection')}
              />
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
              >
                Delete All Data
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const SettingToggle: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ label, description, enabled, onToggle }) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-white font-semibold">{label}</div>
        <div className="text-white/60 text-sm">{description}</div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-blue-500' : 'bg-white/20'
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
};

export default SettingsPage;
