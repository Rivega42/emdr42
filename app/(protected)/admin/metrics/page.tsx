'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { PlatformMetrics } from '@/lib/types';

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function AdminMetricsPage() {
  const { hasRole } = useAuth();
  const router = useRouter();

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>('30d');

  useEffect(() => {
    if (!hasRole('ADMIN')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasRole, router, range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-300">
        {error}
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Sessions',
      value: metrics?.totalSessions ?? '--',
      icon: '📋',
    },
    {
      label: 'Completion Rate',
      value:
        metrics?.completionRate != null
          ? `${metrics.completionRate.toFixed(1)}%`
          : '--',
      icon: '✅',
    },
    {
      label: 'Avg Duration',
      value:
        metrics?.avgSessionDuration != null
          ? `${metrics.avgSessionDuration.toFixed(0)} min`
          : '--',
      icon: '⏱️',
    },
    {
      label: 'Avg SUDS Reduction',
      value:
        metrics?.avgSudsReduction != null
          ? metrics.avgSudsReduction.toFixed(1)
          : '--',
      icon: '📉',
    },
    {
      label: 'Safety Events',
      value: metrics?.safetyEventsCount ?? '--',
      icon: '🚨',
    },
  ];

  const breakdown = metrics?.sessionStatusBreakdown;
  const breakdownTotal =
    breakdown
      ? breakdown.completed + breakdown.aborted + breakdown.paused
      : 0;

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Detailed Metrics</h1>
          <p className="text-amber-300/70">Platform analytics and performance data</p>
        </div>
        <div className="flex gap-2">
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setRange(tr.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                range === tr.value
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                  : 'bg-white/10 text-white/60 border border-white/10 hover:bg-white/20'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10"
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="text-white/50 text-sm">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Session Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-6">
            Session Status Breakdown
          </h3>
          {breakdown && breakdownTotal > 0 ? (
            <div className="space-y-4">
              {[
                {
                  label: 'Completed',
                  count: breakdown.completed,
                  color: 'bg-green-500',
                },
                {
                  label: 'Aborted',
                  count: breakdown.aborted,
                  color: 'bg-red-500',
                },
                {
                  label: 'Paused',
                  count: breakdown.paused,
                  color: 'bg-yellow-500',
                },
              ].map((item) => {
                const pct = ((item.count / breakdownTotal) * 100).toFixed(1);
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{item.label}</span>
                      <span className="text-white/60">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-white/40 text-center py-8">No data available</div>
          )}
        </motion.div>

        {/* Top Patterns */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Top Patterns Used</h3>
          {metrics?.topPatterns && metrics.topPatterns.length > 0 ? (
            <div className="space-y-3">
              {metrics.topPatterns.map((p, i) => (
                <div
                  key={p.pattern}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-white capitalize">{p.pattern}</span>
                  </div>
                  <span className="text-white/60 text-sm">{p.count} sessions</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white/40 text-center py-8">No data available</div>
          )}
        </motion.div>
      </div>

      {/* User Growth placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
      >
        <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
        <div className="h-48 flex items-end justify-around gap-1 px-4">
          {[12, 18, 22, 28, 35, 40, 48, 55, 62, 70, 78, 85].map((h, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all"
                style={{ height: `${(h / 85) * 100}%` }}
              />
              <span className="text-white/30 text-[10px] mt-1">
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
              </span>
            </div>
          ))}
        </div>
        <div className="text-center text-white/40 text-sm mt-2">
          Chart visualization placeholder — connect to time-series data
        </div>
      </motion.div>
    </div>
  );
}
