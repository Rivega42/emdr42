'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { MetricCard } from '@/components/ui/MetricCard';
import { Icon } from '@/components/ui/icons';

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
    { label: 'Сессий на этой неделе', value: sessionsThisWeek },
    { label: 'Текущий streak', value: `${data?.currentStreak ?? 0} дней` },
    { label: 'Общее время', value: `${totalHours}ч` },
    { label: 'Уровень', value: data?.level ?? 1 },
  ];

  return (
    <>
      <div>
        <h1 className="c-h1">С возвращением, {user?.name || 'друг'}!</h1>
        <p className="c-sub">Готовы к сессии?</p>
      </div>

      <div className="c-grid-4">
        {quickStats.map((stat) => (
          <MetricCard key={stat.label} label={stat.label} value={loading ? '…' : stat.value} />
        ))}
      </div>

      <div className="c-grid-2">
        <div className="c-panel">
          <h2 className="c-panel__title">Начать новую сессию</h2>
          <p className="c-sub" style={{ marginBottom: 'var(--space-6)' }}>
            EMDR-сессия с ИИ-ассистентом и адаптивной билатеральной стимуляцией.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link href="/session" className="e-btn e-btn--primary e-btn--md">
              Быстрый старт
            </Link>
            <Link href="/session?guided=true" className="e-btn e-btn--ghost e-btn--md">
              Направляемая сессия
            </Link>
          </div>
        </div>
        <div className="c-panel">
          <h2 className="c-panel__title">Цель дня</h2>
          <p className="c-sub" style={{ marginBottom: 'var(--space-4)' }}>
            {data && data.currentStreak > 0
              ? `Продолжить streak (${data.currentStreak} дней)`
              : 'Пройти первую сессию сегодня'}
          </p>
          <div className="c-bar" aria-hidden="true">
            <div className="c-bar__fill" style={{ width: `${sessionsThisWeek > 0 ? 100 : 0}%` }} />
          </div>
          <p className="c-sub" style={{ marginTop: 'var(--space-2)' }}>
            {sessionsThisWeek > 0 ? 'Цель выполнена!' : 'Откройте сессию, чтобы начать'}
          </p>
        </div>
      </div>

      <div className="c-panel">
        <div className="c-panel__head">
          <h2 className="c-panel__title">Недавние сессии</h2>
          <Link href="/progress" className="c-link text-accent hover:underline">
            Все сессии →
          </Link>
        </div>
        {loading ? (
          <p className="c-sub" style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>Загрузка…</p>
        ) : data && data.sessions.length > 0 ? (
          <div className="c-sessions">
            {data.sessions.map((session) => (
              <div key={session.id} className="c-session-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <span className="c-session-row__date">
                  {session.startedAt
                    ? new Date(session.startedAt).toLocaleString('ru-RU', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : 'Дата не указана'}
                </span>
                <span className="c-session-row__meta">
                  {session.durationSec ? `${Math.round(session.durationSec / 60)} мин` : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="c-sub" style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            Вы ещё не проводили сессий. Начните первую!
          </p>
        )}
      </div>

      <div className="c-crisis" role="note">
        <Icon name="heart" />
        <span>
          Если вам тяжело прямо сейчас — позвоните <a href="tel:88002000122">8-800-2000-122</a> (бесплатно, круглосуточно) или откройте{' '}
          <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer">befrienders.org</a>.
        </span>
      </div>
    </>
  );
}
