'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface RecentSession {
  id: string;
  sessionNumber: number;
  blsPattern: string;
  durationSeconds?: number | null;
  durationMinutes?: number | null;
  createdAt: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ thisWeek: 0, totalMinutes: 0, streak: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) api.setToken(token);
        const data = await api.getSessions({ page: 1, limit: 5 });
        const list = data.data || [];
        setSessions(list);

        // Calculate stats
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = list.filter((s: RecentSession) => new Date(s.createdAt) > weekAgo).length;
        const totalMinutes = list.reduce((sum: number, s: RecentSession) => {
          const dur = s.durationSeconds ?? (s.durationMinutes ? s.durationMinutes * 60 : 0);
          return sum + (dur || 0);
        }, 0) / 60;

        setStats({ thisWeek, totalMinutes: Math.round(totalMinutes), streak: thisWeek > 0 ? thisWeek : 0 });
      } catch {
        // API unavailable — show defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const quickStats = [
    { label: 'Sessions This Week', value: loading ? '...' : String(stats.thisWeek) },
    { label: 'Current Streak', value: loading ? '...' : `${stats.streak} days` },
    { label: 'Total Time', value: loading ? '...' : `${stats.totalMinutes}m` },
    { label: 'Mood Trend', value: loading ? '...' : stats.thisWeek > 0 ? 'Improving' : 'Start today' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {user?.name || 'User'}!</h1>
        <p className="text-gray-500">Ready for your therapy session today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-gray-400 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Start New Session</h2>
          <p className="text-gray-500 mb-6">Begin your EMDR therapy session with personalized patterns and real-time adaptation.</p>
          <div className="flex gap-4">
            <Link href="/session" className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors">Quick Start</Link>
            <Link href="/session?guided=true" className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-md transition-colors">Guided Session</Link>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Today&apos;s Goal</h3>
          <p className="text-gray-500 mb-4">Complete a 15-minute session</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.totalMinutes / 15) * 100)}%` }} />
          </div>
          <p className="text-gray-400 text-sm">
            {stats.totalMinutes >= 15 ? 'Goal completed!' : `${Math.max(0, 15 - stats.totalMinutes)} min remaining`}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Recent Sessions</h3>
          <Link href="/progress" className="text-gray-900 hover:underline text-sm">View All</Link>
        </div>
        {sessions.length === 0 && !loading ? (
          <div className="text-gray-400 text-center py-8">No sessions yet. Start your first session!</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="text-gray-900 font-semibold">
                    {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-gray-400 text-sm capitalize">{session.blsPattern || 'horizontal'} pattern</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    session.status === 'ABORTED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{session.status}</span>
                  <span className="text-gray-600">
                    {session.durationSeconds ? `${Math.round(session.durationSeconds / 60)}m` :
                     session.durationMinutes ? `${session.durationMinutes}m` : '--'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
