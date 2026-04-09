'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasRole, router]);

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

  const statCards = [
    {
      label: 'Total Users',
      value: metrics?.totalUsers ?? '--',
      icon: '👥',
      color: 'from-amber-500/20 to-orange-500/20',
    },
    {
      label: 'Active Sessions',
      value: metrics?.activeSessionsNow ?? '--',
      icon: '🟢',
      color: 'from-green-500/20 to-emerald-500/20',
    },
    {
      label: 'Sessions Today',
      value: metrics?.sessionsToday ?? '--',
      icon: '📊',
      color: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      label: 'Safety Alerts',
      value: metrics?.safetyAlertsCount ?? '--',
      icon: '🚨',
      color: 'from-red-500/20 to-pink-500/20',
    },
  ];

  const systemChecks = [
    { label: 'API Server', status: 'operational' },
    { label: 'Database', status: 'operational' },
    { label: 'Redis Cache', status: 'operational' },
    { label: 'WebRTC (LiveKit)', status: 'planned' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-amber-300/70">Platform overview and management</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-gradient-to-br ${card.color} backdrop-blur-md rounded-2xl p-6 border border-white/10`}
          >
            <div className="text-3xl mb-2">{card.icon}</div>
            <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
            <div className="text-white/60 text-sm">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Charts placeholder */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Sessions per Day</h3>
          <div className="h-48 flex items-end justify-around gap-2 px-4">
            {[35, 50, 42, 65, 48, 72, 55].map((h, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-md"
                  style={{ height: `${(h / 72) * 100}%` }}
                />
                <span className="text-white/40 text-xs mt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Avg SUDS Reduction</h3>
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-amber-400">
                {metrics?.avgSudsReduction != null
                  ? `${metrics.avgSudsReduction.toFixed(1)}`
                  : '--'}
              </div>
              <div className="text-white/50 mt-2">points average reduction</div>
              <div className="mt-4 text-white/40 text-sm">
                Chart visualization coming soon
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Safety Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Recent Safety Alerts</h3>
          <div className="space-y-3">
            {metrics?.recentSafetyAlerts && metrics.recentSafetyAlerts.length > 0 ? (
              metrics.recentSafetyAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <span className="text-red-400 mt-0.5">
                    {alert.type === 'stress_critical' && '🔴'}
                    {alert.type === 'dissociation' && '🟡'}
                    {alert.type === 'panic' && '🔴'}
                    {alert.type === 'manual_stop' && '🟠'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {alert.userName}
                    </div>
                    <div className="text-white/60 text-xs">{alert.message}</div>
                    <div className="text-white/40 text-xs mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-white/40 text-sm text-center py-8">
                No recent safety alerts
              </div>
            )}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-3">
            {systemChecks.map((check) => (
              <div
                key={check.label}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
              >
                <span className="text-white">{check.label}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    check.status === 'operational'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
