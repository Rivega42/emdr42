'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const quickStats = [
    { label: 'Sessions This Week', value: '5', icon: '📊' },
    { label: 'Current Streak', value: '3 days', icon: '🔥' },
    { label: 'Total Time', value: '2.5h', icon: '⏱️' },
    { label: 'Mood Trend', value: '↑ 15%', icon: '😊' }
  ];

  const recentSessions = [
    { date: 'Today, 2:30 PM', duration: '15 min', pattern: 'Horizontal' },
    { date: 'Yesterday, 7:00 PM', duration: '20 min', pattern: 'Wave' },
    { date: 'Dec 3, 8:30 AM', duration: '10 min', pattern: 'Infinity' }
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Welcome back!</h1>
        <p className="text-white/70">Ready for your therapy session today?</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {quickStats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-white/60 text-sm">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-3xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">Start New Session</h2>
          <p className="text-white/70 mb-6">Begin your EMDR therapy session with personalized patterns and real-time adaptation.</p>
          <div className="flex gap-4">
            <Link href="/session" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all">
              Quick Start
            </Link>
            <Link href="/session?guided=true" className="px-6 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-all">
              Guided Session
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/10 backdrop-blur-md rounded-3xl p-8">
          <h3 className="text-xl font-bold text-white mb-4">Today&apos;s Goal</h3>
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-white/70 mb-4">Complete a 15-minute session</p>
          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
          </div>
          <p className="text-white/60 text-sm">9 min remaining</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/10 backdrop-blur-md rounded-3xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Recent Sessions</h3>
          <Link href="/progress" className="text-blue-400 hover:text-blue-300">View All &rarr;</Link>
        </div>
        <div className="space-y-3">
          {recentSessions.map((session, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <div>
                <div className="text-white font-semibold">{session.date}</div>
                <div className="text-white/60 text-sm">{session.pattern} pattern</div>
              </div>
              <div className="text-white/80">{session.duration}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
