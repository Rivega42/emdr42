import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Session } from '../services/types';

type TimeRange = '7d' | '30d' | 'all';

const formatDuration = (seconds: number): string => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const statusBadge = (status: Session['status']) => {
  const map: Record<Session['status'], { bg: string; text: string; label: string }> = {
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
    interrupted: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Interrupted' },
    'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'In Progress' },
  };
  const s = map[status];
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

// --- Loading skeleton ---
const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
    <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="animate-pulse bg-white/5 rounded-xl h-8 w-48" />
      </div>
    </header>
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse bg-white/5 rounded-2xl h-28" />
        ))}
      </div>
      <div className="animate-pulse bg-white/5 rounded-2xl h-64 mb-8" />
      <div className="animate-pulse bg-white/5 rounded-2xl h-48" />
    </div>
  </div>
);

// --- Error state ---
const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center">
        <div className="text-4xl mb-4">{'\u26A0\uFE0F'}</div>
        <h2 className="text-xl font-bold text-white mb-2">Could not load data</h2>
        <p className="text-white/60 mb-6">The API is currently unavailable. Please try again.</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

// --- Empty state ---
const EmptyState: React.FC = () => (
  <div className="text-center py-16">
    <div className="text-5xl mb-4">{'\u{1F4CB}'}</div>
    <h2 className="text-xl font-bold text-white mb-2">No sessions yet</h2>
    <p className="text-white/60 mb-6">Complete your first session to see your progress here.</p>
    <Link
      to="/session"
      className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all"
    >
      Start a Session
    </Link>
  </div>
);

const generateInsights = (sessions: Session[]): string[] => {
  if (sessions.length === 0) return [];
  const insights: string[] = [];

  // Most used pattern
  const patternCount: Record<string, number> = {};
  sessions.forEach(s => {
    patternCount[s.pattern] = (patternCount[s.pattern] || 0) + 1;
  });
  const topPattern = Object.entries(patternCount).sort((a, b) => b[1] - a[1])[0];
  if (topPattern) {
    insights.push(`Your most used pattern is ${topPattern[0]} (${topPattern[1]} sessions)`);
  }

  // Average session length
  const avgDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length;
  insights.push(`Average session length: ${formatDuration(avgDuration)}`);

  // SUDS reduction
  const withSuds = sessions.filter(s => s.sudsStart != null && s.sudsEnd != null);
  if (withSuds.length > 0) {
    const avgReduction =
      withSuds.reduce((sum, s) => sum + ((s.sudsStart ?? 0) - (s.sudsEnd ?? 0)), 0) / withSuds.length;
    if (avgReduction > 0) {
      insights.push(`Average SUDS reduction per session: ${avgReduction.toFixed(1)} points`);
    }
  }

  // Consistency
  if (sessions.length >= 3) {
    insights.push(`You have completed ${sessions.length} sessions -- keep up the great work!`);
  }

  return insights;
};

export const ProgressPage: React.FC = () => {
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const fetchData = () => {
    setLoading(true);
    setError(false);
    api
      .getSessions({ limit: 50 })
      .then(data => {
        setAllSessions(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (timeRange === 'all') return allSessions;
    const now = new Date();
    const days = timeRange === '7d' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return allSessions.filter(s => new Date(s.date) >= cutoff);
  }, [allSessions, timeRange]);

  const stats = useMemo(() => {
    const totalTime = filtered.reduce((sum, s) => sum + s.duration, 0);
    const withSuds = filtered.filter(s => s.sudsStart != null && s.sudsEnd != null);
    const avgSudsReduction =
      withSuds.length > 0
        ? withSuds.reduce((sum, s) => sum + ((s.sudsStart ?? 0) - (s.sudsEnd ?? 0)), 0) / withSuds.length
        : 0;

    // streak
    let streak = 0;
    const dateSet = new Set(filtered.map(s => new Date(s.date).toDateString()));
    const day = new Date();
    while (dateSet.has(day.toDateString())) {
      streak++;
      day.setDate(day.getDate() - 1);
    }

    return [
      { label: 'Total Sessions', value: String(filtered.length) },
      { label: 'Total Time', value: formatDuration(totalTime) },
      { label: 'Avg SUDS Reduction', value: avgSudsReduction ? `${avgSudsReduction.toFixed(1)}` : '--' },
      { label: 'Streak', value: streak ? `${streak} day${streak > 1 ? 's' : ''}` : '0' },
    ];
  }, [filtered]);

  const insights = useMemo(() => generateInsights(filtered), [filtered]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-white/70 hover:text-white">{'\u2190'} Back</Link>
              <h1 className="text-2xl font-bold text-white">Your Progress</h1>
            </div>
            <div className="flex gap-2">
              {(['7d', '30d', 'all'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    timeRange === range
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {range === 'all' ? 'All' : range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6"
                >
                  <div className="text-white/60 text-sm mb-2">{stat.label}</div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Emotional Trends Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8"
            >
              <h3 className="text-xl font-bold text-white mb-4">Emotional Trends</h3>
              <div className="h-48 flex items-center justify-center text-white/40 border border-dashed border-white/10 rounded-xl">
                Charts will be available when chart library is integrated
              </div>
            </motion.div>

            {/* Session History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8"
            >
              <h3 className="text-xl font-bold text-white mb-4">Session History</h3>
              <div className="space-y-3">
                {filtered.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">{Math.round(session.duration / 60)}</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold">{formatDate(session.date)}</div>
                        <div className="text-white/60 text-sm">{session.pattern} pattern</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {session.sudsStart != null && session.sudsEnd != null && (
                        <div className="text-right text-sm">
                          <div className="text-white/60">
                            SUDS: {session.sudsStart} {'\u2192'} {session.sudsEnd}
                          </div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-white/80 text-sm mb-1">{formatDuration(session.duration)}</div>
                        {statusBadge(session.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* AI Insights */}
            {insights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-6 border border-white/10"
              >
                <h3 className="text-xl font-bold text-white mb-3">AI Insights</h3>
                <ul className="space-y-2 text-white/80">
                  {insights.map((insight, i) => (
                    <li key={i}>{'\u2022'} {insight}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
