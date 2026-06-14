'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { EmotionTimeline, type EmotionPoint } from '@/components/ui/EmotionTimeline';
import { MetricCard } from '@/components/ui/MetricCard';
import { Icon } from '@/components/ui/icons';

interface AnalyticsData {
  totalSessions: number;
  completed: number;
  completionRate: number;
  avgSudsReduction: number;
  avgVocGain: number;
  avgDurationSec: number;
  sessions: Array<{
    id: string;
    startedAt: string | null;
    durationSec: number | null;
    sudsBaseline: number | null;
    sudsFinal: number | null;
    vocBaseline: number | null;
    vocFinal: number | null;
  }>;
}

interface ProgressData {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  xpToNextLevel: number;
  achievements: Array<{ key: string; title: string; description: string; icon: string; unlockedAt: string }>;
  locked: Array<{ key: string; title: string; description: string; icon: string }>;
}

export default function ProgressPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsData, progressData] = await Promise.all([
          api.getMyAnalytics(),
          api.getMyProgress(),
        ]);
        setAnalytics(analyticsData);
        setProgress(progressData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // SUDS trajectory как EmotionPoints (нормализуем SUDS 0-10 → 0-1)
  const sudsPoints: EmotionPoint[] = useMemo(() => {
    if (!analytics) return [];
    return analytics.sessions
      .filter((s) => s.sudsBaseline != null && s.startedAt)
      .flatMap((s, i) => {
        const points: EmotionPoint[] = [
          { timestamp: i * 60, stress: (s.sudsBaseline ?? 0) / 10, engagement: 0.5, valence: 0.5 },
        ];
        if (s.sudsFinal != null) {
          points.push({
            timestamp: i * 60 + 30,
            stress: s.sudsFinal / 10,
            engagement: 0.5,
            valence: 0.5,
          });
        }
        return points;
      });
  }, [analytics]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <h1 className="c-h1">Прогресс</h1>
        <div className="c-panel" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-12)' }}>
          Загрузка…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <h1 className="c-h1">Прогресс</h1>
        <div role="alert" className="p-6 bg-danger-soft border border-danger rounded-lg text-danger">
          {error}
        </div>
      </div>
    );
  }

  const noData = !analytics || analytics.totalSessions === 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 className="c-h1">Прогресс</h1>
          <p className="c-sub">История ваших сессий и достижения</p>
        </div>
        {progress && (
          <span className="c-streak"><Icon name="flame" /> {progress.currentStreak} дней</span>
        )}
      </div>

      {noData ? (
        <div className="c-panel" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-12)' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>Данных пока нет. Начните первую сессию, чтобы увидеть прогресс.</p>
          <a href="/session" className="e-btn e-btn--primary e-btn--md">Начать сессию</a>
        </div>
      ) : (
        <>
          {/* Метрики */}
          <div className="c-grid-4">
            <MetricCard label="Всего сессий" value={analytics.totalSessions} />
            <MetricCard
              label="Завершено"
              value={`${analytics.completed} (${Math.round(analytics.completionRate * 100)}%)`}
            />
            <MetricCard label="Среднее SUDS↓" value={analytics.avgSudsReduction.toFixed(1)} deltaTone="good" />
            <MetricCard label="Средний VOC↑" value={analytics.avgVocGain.toFixed(1)} deltaTone="good" />
          </div>

          {/* Уровень / XP */}
          {progress && (
            <div className="c-panel">
              <div className="c-panel__head">
                <h2 className="c-panel__title">Уровень {progress.level}</h2>
                <span className="c-sub">
                  {progress.xp} XP · до следующего уровня: {progress.xpToNextLevel} XP
                </span>
              </div>
              <div
                className="c-bar"
                role="progressbar"
                aria-label="Прогресс уровня"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(
                  progress.xpToNextLevel > 0
                    ? (progress.xp / (progress.xp + progress.xpToNextLevel)) * 100
                    : 100,
                )}
              >
                <div
                  className="c-bar__fill"
                  style={{
                    width: `${
                      progress.xpToNextLevel > 0
                        ? (progress.xp / (progress.xp + progress.xpToNextLevel)) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* SUDS timeline */}
          {sudsPoints.length > 1 && (
            <div className="c-panel">
              <h2 className="c-panel__title">Динамика SUDS по сессиям</h2>
              <EmotionTimeline points={sudsPoints} />
              <p className="c-sub" style={{ marginTop: 'var(--space-2)' }}>
                Линия — SUDS (нормализован 0-1). Начало и конец каждой сессии.
              </p>
            </div>
          )}

          {/* Последние сессии */}
          <div className="c-panel">
            <h2 className="c-panel__title">Последние сессии</h2>
            <div className="c-sessions">
              {analytics.sessions.slice(-10).reverse().map((s) => (
                <div key={s.id} className="c-session-row">
                  <span className="c-session-row__date">
                    {s.startedAt ? new Date(s.startedAt).toLocaleDateString('ru-RU') : '—'}
                  </span>
                  <span className="c-session-row__meta c-session-row__hide-m">
                    {s.durationSec ? `${Math.round(s.durationSec / 60)} мин` : '—'}
                  </span>
                  <span className="c-session-row__meta">
                    {s.sudsBaseline != null && s.sudsFinal != null ? (
                      <>SUDS: {s.sudsBaseline} → <strong style={{ color: 'var(--accent)' }}>{s.sudsFinal}</strong></>
                    ) : null}
                  </span>
                  <span className="c-session-row__meta c-session-row__hide-m">
                    {s.vocFinal != null ? <>VOC: <strong>{s.vocFinal}</strong>/7</> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Достижения */}
          {progress && progress.achievements.length > 0 && (
            <div className="c-panel">
              <h2 className="c-panel__title">Достижения</h2>
              <div className="c-grid-achv">
                {progress.achievements.map((a) => (
                  <div key={a.key} className="e-achv e-achv--unlocked" title={a.description}>
                    <span className="e-achv__icon" aria-hidden="true">
                      <Icon name="sparkles" size={20} />
                    </span>
                    <span className="e-achv__title">{a.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
