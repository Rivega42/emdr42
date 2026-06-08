'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface DashboardData {
  totalSessions: number;
  completionRate: number;
  avgSudsReduction: number;
  avgDurationSec: number;
  sessions: Array<{
    id: string;
    startedAt: string | null;
    durationSec: number | null;
  }>;
  level: number;
  xp: number;
  currentStreak: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [analytics, progress] = await Promise.all([
          api.getMyAnalytics(),
          api.getMyProgress(),
        ]);
        setData({
          totalSessions: analytics.totalSessions,
          completionRate: analytics.completionRate,
          avgSudsReduction: analytics.avgSudsReduction,
          avgDurationSec: analytics.avgDurationSec,
          sessions: analytics.sessions.slice(-5).reverse(),
          level: progress.level,
          xp: progress.xp,
          currentStreak: progress.currentStreak,
        });
      } catch {
        // При ошибке показываем placeholder
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sessionsThisWeek = data?.sessions.filter((s) => {
    if (!s.startedAt) return false;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(s.startedAt).getTime() > weekAgo;
  }).length ?? 0;

  const totalHours = data ? (data.sessions.reduce((sum, s) => sum + (s.durationSec ?? 0), 0) / 3600).toFixed(1) : '0';

  const quickStats = [
    { label: 'Сессий на этой неделе', value: sessionsThisWeek, icon: '📊' },
    { label: 'Текущий streak', value: `${data?.currentStreak ?? 0} дней`, icon: '🔥' },
    { label: 'Общее время', value: `${totalHours}ч`, icon: '⏱️' },
    { label: 'Уровень', value: data?.level ?? 1, icon: '🏆' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">С возвращением, {user?.name || 'друг'}!</h1>
        <p className="text-gray-500">Готовы к сессии?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-3xl mb-2" aria-hidden="true">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {loading ? '…' : stat.value}
            </div>
            <div className="text-gray-400 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Начать новую сессию</h2>
          <p className="text-gray-500 mb-6">
            EMDR-сессия с ИИ-ассистентом и адаптивной билатеральной стимуляцией.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/session"
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors"
            >
              Быстрый старт
            </Link>
            <Link
              href="/session?guided=true"
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-md transition-colors"
            >
              Направляемая сессия
            </Link>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Цель дня</h3>
          <div className="text-4xl mb-4" aria-hidden="true">🎯</div>
          <p className="text-gray-500 mb-4">
            {data && data.currentStreak > 0
              ? `Продолжить streak (${data.currentStreak} дней)`
              : 'Пройти первую сессию сегодня'}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${sessionsThisWeek > 0 ? 100 : 0}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm">
            {sessionsThisWeek > 0 ? 'Цель выполнена!' : 'Откройте сессию, чтобы начать'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Недавние сессии</h3>
          <Link href="/progress" className="text-gray-900 hover:underline text-sm">
            Все сессии →
          </Link>
        </div>
        {loading ? (
          <p className="text-gray-400 text-center py-8">Загрузка…</p>
        ) : data && data.sessions.length > 0 ? (
          <div className="space-y-3">
            {data.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="text-gray-900 font-semibold">
                    {session.startedAt
                      ? new Date(session.startedAt).toLocaleString('ru-RU', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Дата не указана'}
                  </div>
                </div>
                <div className="text-gray-600">
                  {session.durationSec ? `${Math.round(session.durationSec / 60)} мин` : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">
            Вы ещё не проводили сессий. Начните первую!
          </p>
        )}
      </div>
    </div>
  );
}
