'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { PlatformMetrics } from '@/lib/types';

export default function AdminDashboard() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRole('ADMIN')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      try {
        const data = await api.getMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить метрики');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasRole, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-600" role="alert">
        {error}
      </div>
    );
  }

  const statCards = [
    { label: 'Всего пользователей', value: metrics?.totalUsers ?? '—', icon: '👥', bgColor: 'bg-amber-50' },
    { label: 'Активных сессий', value: metrics?.activeSessionsNow ?? '—', icon: '🟢', bgColor: 'bg-green-50' },
    { label: 'Сессий сегодня', value: metrics?.sessionsToday ?? '—', icon: '📊', bgColor: 'bg-blue-50' },
    { label: 'Safety alerts', value: metrics?.safetyAlertsCount ?? '—', icon: '🚨', bgColor: 'bg-red-50' },
  ];

  const systemChecks = [
    { label: 'API сервер', status: 'operational' },
    { label: 'База данных', status: 'operational' },
    { label: 'Redis', status: 'operational' },
    { label: 'LiveKit (WebRTC)', status: 'planned' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Панель администратора</h1>
        <p className="text-gray-500">Обзор платформы и управление</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.bgColor} border border-gray-200 rounded-lg p-6`}>
            <div className="text-3xl mb-2" aria-hidden="true">{card.icon}</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{card.value}</div>
            <div className="text-gray-500 text-sm">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Среднее снижение SUDS</h2>
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">
                {metrics?.avgSudsReduction != null ? metrics.avgSudsReduction.toFixed(1) : '—'}
              </div>
              <div className="text-gray-400 mt-2">средняя редукция (пункты)</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Состояние системы</h2>
          <div className="space-y-3">
            {systemChecks.map((check) => (
              <div key={check.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{check.label}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    check.status === 'operational'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {check.status === 'operational' ? 'работает' : 'планируется'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Недавние safety alerts</h2>
        <div className="space-y-3">
          {metrics?.recentSafetyAlerts && metrics.recentSafetyAlerts.length > 0 ? (
            metrics.recentSafetyAlerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <span className="text-red-500 mt-0.5" aria-hidden="true">
                  {alert.type === 'stress_critical' && '🔴'}
                  {alert.type === 'dissociation' && '🟡'}
                  {alert.type === 'panic' && '🔴'}
                  {alert.type === 'manual_stop' && '🟠'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 text-sm font-medium truncate">{alert.userName}</div>
                  <div className="text-gray-500 text-xs">{alert.message}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {new Date(alert.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm text-center py-8">Нет недавних safety alerts</div>
          )}
        </div>
      </div>
    </div>
  );
}
