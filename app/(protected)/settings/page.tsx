'use client';

import React, { useState } from 'react';

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
  const [settings, setSettings] = useState({ notifications: true, emailReminders: true, soundEffects: true, binauralBeats: false, adaptiveMode: true, darkMode: true, dataCollection: false });
  const handleToggle = (key: keyof typeof settings) => { setSettings((prev) => ({ ...prev, [key]: !prev[key] })); };

  return (
    <div className="max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Settings</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
          <div className="space-y-4">
            <div><label className="block text-gray-500 text-sm mb-2">Display Name</label><input type="text" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-gray-900 transition-colors" placeholder="John Doe" /></div>
            <div><label className="block text-gray-500 text-sm mb-2">Email</label><input type="email" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-gray-900 transition-colors" placeholder="john@example.com" /></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Therapy Preferences</h2>
          <div className="space-y-4">
            <SettingToggle label="Adaptive Mode" description="AI adjusts patterns based on your emotional state" enabled={settings.adaptiveMode} onToggle={() => handleToggle('adaptiveMode')} />
            <SettingToggle label="Binaural Beats" description="Enable therapeutic sound frequencies" enabled={settings.binauralBeats} onToggle={() => handleToggle('binauralBeats')} />
            <SettingToggle label="Sound Effects" description="Play ambient sounds during sessions" enabled={settings.soundEffects} onToggle={() => handleToggle('soundEffects')} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h2>
          <div className="space-y-4">
            <SettingToggle label="Push Notifications" description="Receive session reminders" enabled={settings.notifications} onToggle={() => handleToggle('notifications')} />
            <SettingToggle label="Email Reminders" description="Get weekly progress reports" enabled={settings.emailReminders} onToggle={() => handleToggle('emailReminders')} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy</h2>
          <div className="space-y-4">
            <SettingToggle label="Anonymous Analytics" description="Help improve the app with anonymous usage data" enabled={settings.dataCollection} onToggle={() => handleToggle('dataCollection')} />
            <button className="px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors">Delete All Data</button>
          </div>
        </div>
        <div className="flex justify-end"><button className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors">Save Changes</button></div>
      </div>
    </div>
  );
}
