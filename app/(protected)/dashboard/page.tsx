'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  const quickStats = [
    { label: 'Sessions This Week', value: '5', icon: '📊' },
    { label: 'Current Streak', value: '3 days', icon: '🔥' },
    { label: 'Total Time', value: '2.5h', icon: '⏱️' },
    { label: 'Mood Trend', value: '+15%', icon: '😊' },
  ];

  const recentSessions = [
    { date: 'Today, 2:30 PM', duration: '15 min', pattern: 'Horizontal' },
    { date: 'Yesterday, 7:00 PM', duration: '20 min', pattern: 'Wave' },
    { date: 'Apr 3, 8:30 AM', duration: '10 min', pattern: 'Infinity' },
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
            <div className="text-3xl mb-2">{stat.icon}</div>
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
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-gray-500 mb-4">Complete a 15-minute session</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }} /></div>
          <p className="text-gray-400 text-sm">9 min remaining</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Recent Sessions</h3>
          <Link href="/progress" className="text-gray-900 hover:underline text-sm">View All →</Link>
        </div>
        <div className="space-y-3">
          {recentSessions.map((session, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div>
                <div className="text-gray-900 font-semibold">{session.date}</div>
                <div className="text-gray-400 text-sm">{session.pattern} pattern</div>
              </div>
              <div className="text-gray-600">{session.duration}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
