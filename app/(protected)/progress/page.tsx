'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { EmotionTimeline, type EmotionPoint } from '@/components/ui/EmotionTimeline';

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
        const base = new Date(s.startedAt!).getTime();
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
      <div className="max-w-7xl mx-auto" role="status" aria-live="polite">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Прогресс</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
          Загрузка…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Прогресс</h1>
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const noData = !analytics || analytics.totalSessions === 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Прогресс</h1>
        <p className="text-gray-500">История ваших сессий и достижения</p>
      </div>

      {noData ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
          <p className="mb-4">Данных пока нет. Начните первую сессию, чтобы увидеть прогресс.</p>
          <a
            href="/session"
            className="inline-block px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors"
          >
            Начать сессию
          </a>
        </div>
      ) : (
        <>
          {/* Gamification summary */}
          {progress && (
            <section className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">Уровень {progress.level}</div>
                  <div className="text-sm text-gray-500">
                    {progress.xp} XP · до следующего уровня: {progress.xpToNextLevel} XP
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Текущий streak</div>
                  <div className="text-xl font-bold text-gray-900">
                    🔥 {progress.currentStreak} дней
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gray-900 transition-all"
                  style={{
                    width: `${
                      progress.xpToNextLevel > 0
                        ? (progress.xp /
                            (progress.xp + progress.xpToNextLevel)) *
                          100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </section>
          )}

          {/* Metrics */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Всего сессий" value={analytics.totalSessions} />
            <MetricCard
              label="Завершено"
              value={`${analytics.completed} (${Math.round(analytics.completionRate * 100)}%)`}
            />
            <MetricCard label="Среднее SUDS↓" value={analytics.avgSudsReduction.toFixed(1)} />
            <MetricCard label="Средний VOC↑" value={analytics.avgVocGain.toFixed(1)} />
          </section>

          {/* SUDS timeline */}
          {sudsPoints.length > 1 && (
            <section className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Динамика SUDS по сессиям</h2>
              <EmotionTimeline points={sudsPoints} />
              <p className="text-xs text-gray-400 mt-2">
                Красная линия — SUDS (нормализован 0-1). Начало и конец каждой сессии.
              </p>
            </section>
          )}

          {/* Sessions list */}
          <section className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Последние сессии</h2>
            <div className="space-y-2">
              {analytics.sessions.slice(-10).reverse().map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 text-sm"
                >
                  <span className="text-gray-500">
                    {s.startedAt ? new Date(s.startedAt).toLocaleDateString('ru-RU') : '—'}
                  </span>
                  <span className="text-gray-500">
                    {s.durationSec ? `${Math.round(s.durationSec / 60)} мин` : '—'}
                  </span>
                  {s.sudsBaseline != null && s.sudsFinal != null && (
                    <span className="text-gray-700">
                      SUDS: {s.sudsBaseline} → <strong>{s.sudsFinal}</strong>
                    </span>
                  )}
                  {s.vocFinal != null && (
                    <span className="text-gray-700">
                      VOC: <strong>{s.vocFinal}</strong>/7
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Achievements */}
          {progress && progress.achievements.length > 0 && (
            <section className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Достижения</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {progress.achievements.map((a) => (
                  <div
                    key={a.key}
                    className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg"
                    title={a.description}
                  >
                    <span className="text-3xl mb-1" aria-hidden="true">{a.icon}</span>
                    <span className="text-xs font-semibold text-gray-900">{a.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

const MetricCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);
