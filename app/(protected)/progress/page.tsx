'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ProgressPage() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  const stats = [
    { label: 'Total Sessions', value: '24', change: '+3 this week' },
    { label: 'Total Time', value: '6.5h', change: '+45min this week' },
    { label: 'Stress Reduction', value: '42%', change: '↓ 15% better' },
    { label: 'Consistency', value: '85%', change: '5 day streak' }
  ];

  const recentSessions = [
    { date: 'Today', duration: '15 min', pattern: 'Horizontal', mood: 'Better' },
    { date: 'Yesterday', duration: '20 min', pattern: 'Infinity', mood: 'Calm' },
    { date: 'Dec 3', duration: '10 min', pattern: 'Wave', mood: 'Relaxed' },
    { date: 'Dec 2', duration: '25 min', pattern: 'Butterfly', mood: 'Focused' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Your Progress</h1>
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg transition-colors ${timeRange === range ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <div className="text-white/60 text-sm mb-2">{stat.label}</div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-green-400 text-sm">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts placeholder - TODO: integrate chart library */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Emotional Trends</h3>
          <div className="h-64 w-full flex items-center justify-center text-white/40">
            [Chart: Stress &amp; Calmness trends]
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Pattern Usage</h3>
          <div className="h-64 w-full flex items-center justify-center text-white/40">
            [Chart: Pattern usage distribution]
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-4">Recent Sessions</h3>
        <div className="space-y-3">
          {recentSessions.map((session, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">{session.duration.split(' ')[0]}</span>
                </div>
                <div>
                  <div className="text-white font-semibold">{session.date}</div>
                  <div className="text-white/60 text-sm">{session.pattern} pattern</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/80">{session.duration}</div>
                <div className="text-green-400 text-sm">{session.mood}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-3">AI Insights</h3>
        <ul className="space-y-2 text-white/80">
          <li>Your stress levels have decreased by 42% over the past week</li>
          <li>The Horizontal pattern seems most effective for morning sessions</li>
          <li>Consider trying longer sessions (20-25 min) for deeper relaxation</li>
          <li>Your consistency has improved - keep up the great work!</li>
        </ul>
      </motion.div>
    </div>
  );
}
