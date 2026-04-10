import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import type { Session } from '../services/types';

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

  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const computeStats = (sessions: Session[]) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = sessions.filter(s => new Date(s.date) >= weekAgo);
  const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);

  // streak: consecutive days with sessions ending today
  let streak = 0;
  const dateSet = new Set(sessions.map(s => new Date(s.date).toDateString()));
  const day = new Date(now);
  while (dateSet.has(day.toDateString())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }

  return [
    { label: 'Sessions This Week', value: String(thisWeek.length), icon: '\u{1F4CA}' },
    { label: 'Current Streak', value: streak ? `${streak} day${streak > 1 ? 's' : ''}` : '0', icon: '\u{1F525}' },
    { label: 'Total Time', value: formatDuration(totalTime), icon: '\u{23F1}\u{FE0F}' },
    { label: 'Total Sessions', value: String(sessions.length), icon: '\u{1F4C8}' },
  ];
};

// --- Loading skeleton ---
const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="animate-pulse bg-white/5 rounded-xl h-10 w-64 mb-2" />
        <div className="animate-pulse bg-white/5 rounded-xl h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse bg-white/5 rounded-2xl h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 animate-pulse bg-white/5 rounded-3xl h-48" />
        <div className="animate-pulse bg-white/5 rounded-3xl h-48" />
      </div>
      <div className="animate-pulse bg-white/5 rounded-3xl h-48" />
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

export const DashboardPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    api
      .getSessions({ limit: 5 })
      .then(data => {
        setSessions(data);
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

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState onRetry={fetchData} />;

  const quickStats = computeStats(sessions);
  const isEmpty = sessions.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-white/70">Ready for your therapy session today?</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-white/60 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Start Session Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-3xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Start New Session</h2>
            <p className="text-white/70 mb-6">
              Begin your EMDR therapy session with personalized patterns and real-time adaptation.
            </p>
            <div className="flex gap-4">
              <Link
                to="/session"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Quick Start
              </Link>
              <Link
                to="/session?guided=true"
                className="px-6 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-all"
              >
                Guided Session
              </Link>
            </div>
          </motion.div>

          {/* Today's Goal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-8"
          >
            <h3 className="text-xl font-bold text-white mb-4">Today's Goal</h3>
            <div className="text-4xl mb-4">{'\u{1F3AF}'}</div>
            <p className="text-white/70 mb-4">Complete a 15-minute session</p>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <p className="text-white/60 text-sm">9 min remaining</p>
          </motion.div>
        </div>

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-3xl p-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Recent Sessions</h3>
            <Link to="/progress" className="text-blue-400 hover:text-blue-300">
              View All {'\u2192'}
            </Link>
          </div>

          {isEmpty ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">{'\u{1F331}'}</div>
              <p className="text-white/70 text-lg mb-4">No sessions yet. Start your first session!</p>
              <Link
                to="/session"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Begin Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div>
                    <div className="text-white font-semibold">{formatDate(session.date)}</div>
                    <div className="text-white/60 text-sm">{session.pattern} pattern</div>
                  </div>
                  <div className="text-white/80">{formatDuration(session.duration)}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
