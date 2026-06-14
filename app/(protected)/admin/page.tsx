'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { PlatformMetrics } from '@/lib/types';
import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/icons';

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
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-20) 0' }} role="status" aria-live="polite">
        <div className="spinner" />
        <span className="sr-only">Загрузка…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 bg-danger-soft border border-danger rounded-lg text-danger" role="alert">
        {error}
      </div>
    );
  }

  const statCards = [
    { label: 'Всего пользователей', value: metrics?.totalUsers ?? '—' },
    { label: 'Активных сессий', value: metrics?.activeSessionsNow ?? '—' },
    { label: 'Сессий сегодня', value: metrics?.sessionsToday ?? '—' },
    { label: 'Safety alerts', value: metrics?.safetyAlertsCount ?? '—' },
  ];

  const systemChecks = [
    { label: 'API сервер', status: 'operational' },
    { label: 'База данных', status: 'operational' },
    { label: 'Redis', status: 'operational' },
    { label: 'LiveKit (WebRTC)', status: 'planned' },
  ];

  return (
    <>
      <div>
        <h1 className="c-h1">Панель администратора</h1>
        <p className="c-sub">Обзор платформы и управление</p>
      </div>

      <div className="c-grid-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="c-grid-2">
        <div className="c-panel">
          <h2 className="c-panel__title">Среднее снижение SUDS</h2>
          <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-5xl)', fontWeight: 500, color: 'var(--accent)' }}>
                {metrics?.avgSudsReduction != null ? metrics.avgSudsReduction.toFixed(1) : '—'}
              </div>
              <div className="c-sub" style={{ marginTop: 'var(--space-2)' }}>средняя редукция (пункты)</div>
            </div>
          </div>
        </div>

        <div className="c-panel">
          <h2 className="c-panel__title">Состояние системы</h2>
          <div className="c-syschecks">
            {systemChecks.map((check) => (
              <div key={check.label} className="c-syscheck">
                <span>{check.label}</span>
                {check.status === 'operational' ? (
                  <Badge variant="success">работает</Badge>
                ) : (
                  <Badge variant="warm">планируется</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Недавние safety alerts</h2>
        {metrics?.recentSafetyAlerts && metrics.recentSafetyAlerts.length > 0 ? (
          <div className="c-tl">
            {metrics.recentSafetyAlerts.slice(0, 10).map((alert, i, arr) => (
              <div className="c-tl__item c-tl__item--alert" key={alert.id}>
                <div className="c-tl__rail">
                  <span className="c-tl__icon"><Icon name="alert" size={15} /></span>
                  {i < arr.length - 1 && <span className="c-tl__line" />}
                </div>
                <div className="c-tl__body">
                  <div className="c-tl__user" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                    {alert.userName}
                  </div>
                  <p className="c-tl__text">{alert.message}</p>
                  <div className="c-tl__meta" style={{ marginTop: 2 }}>
                    {new Date(alert.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="c-sub" style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>Нет недавних safety alerts</p>
        )}
      </div>
    </>
  );
}
