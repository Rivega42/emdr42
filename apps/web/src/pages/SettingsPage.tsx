import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailReminders: true,
    soundEffects: true,
    binauralBeats: false,
    adaptiveMode: true,
    darkMode: true,
    dataCollection: false
  });

  const handleToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-white mb-8">Settings</h1>

          {/* Profile Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Display Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          </div>

          {/* Therapy Preferences */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Therapy Preferences</h2>
            <div className="space-y-4">
              <SettingToggle
                label="Adaptive Mode"
                description="AI adjusts patterns based on your emotional state"
                enabled={settings.adaptiveMode}
                onToggle={() => handleToggle('adaptiveMode')}
              />
              <SettingToggle
                label="Binaural Beats"
                description="Enable therapeutic sound frequencies"
                enabled={settings.binauralBeats}
                onToggle={() => handleToggle('binauralBeats')}
              />
              <SettingToggle
                label="Sound Effects"
                description="Play ambient sounds during sessions"
                enabled={settings.soundEffects}
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
                enabled={settings.notifications}
                onToggle={() => handleToggle('notifications')}
              />
              <SettingToggle
                label="Email Reminders"
                description="Get weekly progress reports"
                enabled={settings.emailReminders}
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
                enabled={settings.dataCollection}
                onToggle={() => handleToggle('dataCollection')}
              />
              <button className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors">
                Delete All Data
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all">
              Save Changes
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