'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { PlatformSetting } from '@/lib/types';

interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'password';
  options?: string[];
  description?: string;
}

interface SettingSection {
  title: string;
  category: string;
  accent: string;
  fields: SettingField[];
}

const SECTIONS: SettingSection[] = [
  {
    title: 'AI Providers',
    category: 'ai',
    accent: 'amber',
    fields: [
      {
        key: 'llm_provider',
        label: 'LLM Provider',
        type: 'select',
        options: ['anthropic', 'openai', 'ollama'],
        description: 'Main language model provider',
      },
      {
        key: 'stt_provider',
        label: 'STT Provider',
        type: 'select',
        options: ['whisper', 'deepgram', 'google'],
        description: 'Speech-to-text engine',
      },
      {
        key: 'tts_provider',
        label: 'TTS Provider',
        type: 'select',
        options: ['elevenlabs', 'openai', 'google'],
        description: 'Text-to-speech engine',
      },
      {
        key: 'llm_api_key',
        label: 'LLM API Key',
        type: 'password',
        description: 'API key for the language model provider',
      },
      {
        key: 'stt_api_key',
        label: 'STT API Key',
        type: 'password',
        description: 'API key for the STT provider',
      },
      {
        key: 'tts_api_key',
        label: 'TTS API Key',
        type: 'password',
        description: 'API key for the TTS provider',
      },
    ],
  },
  {
    title: 'EMDR Protocol',
    category: 'emdr',
    accent: 'blue',
    fields: [
      {
        key: 'default_bls_speed',
        label: 'Default BLS Speed (Hz)',
        type: 'number',
        description: 'Default bilateral stimulation frequency',
      },
      {
        key: 'default_set_length',
        label: 'Default Set Length (seconds)',
        type: 'number',
        description: 'Duration of one BLS set',
      },
      {
        key: 'safety_stress_critical',
        label: 'Stress Critical Threshold',
        type: 'number',
        description: 'SUDS level that triggers a safety alert',
      },
      {
        key: 'safety_dissociation_min',
        label: 'Dissociation Attention Min',
        type: 'number',
        description: 'Minimum attention score before dissociation warning',
      },
    ],
  },
  {
    title: 'Platform',
    category: 'platform',
    accent: 'purple',
    fields: [
      {
        key: 'app_name',
        label: 'App Name',
        type: 'text',
        description: 'Displayed application name',
      },
      {
        key: 'maintenance_mode',
        label: 'Maintenance Mode',
        type: 'boolean',
        description: 'Temporarily disable the platform for maintenance',
      },
      {
        key: 'max_session_duration',
        label: 'Max Session Duration (minutes)',
        type: 'number',
        description: 'Maximum allowed session length',
      },
    ],
  },
  {
    title: 'Notifications',
    category: 'notifications',
    accent: 'green',
    fields: [
      {
        key: 'email_notifications',
        label: 'Email Notifications',
        type: 'boolean',
        description: 'Enable email notifications for alerts',
      },
      {
        key: 'alert_email_recipients',
        label: 'Alert Email Recipients',
        type: 'text',
        description: 'Comma-separated list of emails for safety alerts',
      },
    ],
  },
];

export default function AdminSettingsPage() {
  const { hasRole } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRole('ADMIN')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      try {
        const data = await api.getSettings();
        const map: Record<string, string> = {};
        data.forEach((s: PlatformSetting) => {
          map[s.key] = s.value;
        });
        setSettings(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasRole, router]);

  const handleChange = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveSection = useCallback(
    async (section: SettingSection) => {
      setSaving(section.category);
      try {
        for (const field of section.fields) {
          if (settings[field.key] !== undefined) {
            await api.updateSetting(field.key, settings[field.key]);
          }
        }
        setSaved(section.category);
        setTimeout(() => setSaved(null), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(null);
      }
    },
    [settings],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Platform Settings</h1>
        <p className="text-amber-300/70">Configure AI providers, protocols, and notifications</p>
      </motion.div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {SECTIONS.map((section, sIdx) => (
          <motion.div
            key={section.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
          >
            <h2 className="text-2xl font-bold text-white mb-6">{section.title}</h2>
            <div className="space-y-5">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-white/70 text-sm mb-1">
                    {field.label}
                  </label>
                  {field.description && (
                    <p className="text-white/40 text-xs mb-2">{field.description}</p>
                  )}

                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={settings[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  )}

                  {field.type === 'password' && (
                    <input
                      type="password"
                      value={settings[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={settings[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={settings[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-amber-400 transition-colors"
                    >
                      <option value="" className="bg-gray-900">
                        Select...
                      </option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt} className="bg-gray-900">
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'boolean' && (
                    <button
                      onClick={() =>
                        handleChange(
                          field.key,
                          settings[field.key] === 'true' ? 'false' : 'true',
                        )
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings[field.key] === 'true'
                          ? 'bg-amber-500'
                          : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings[field.key] === 'true'
                            ? 'translate-x-6'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSaveSection(section)}
                disabled={saving === section.category}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving === section.category ? 'Saving...' : 'Save'}
              </button>
              {saved === section.category && (
                <span className="text-green-400 text-sm">Saved successfully</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
