'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const userMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/session', label: 'New Session', icon: '🧠' },
  { path: '/progress', label: 'Progress', icon: '📊' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

const adminMenuItems = [
  { path: '/admin', label: 'Admin Dashboard', icon: '🛡️' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/settings', label: 'Platform Settings', icon: '🔧' },
  { path: '/admin/metrics', label: 'Metrics', icon: '📈' },
];

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  THERAPIST: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PATIENT: 'bg-green-500/20 text-green-300 border-green-500/30',
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const isAdmin = hasRole('ADMIN');

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🧠</span>
                </div>
                <span className="text-xl font-bold text-white">EMDR-AI</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 text-white/70">
                <span>Welcome,</span>
                <span className="font-semibold text-white">{user?.name || 'User'}</span>
                {user?.role && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      roleBadgeColors[user.role] || 'bg-white/10 text-white/70 border-white/20'
                    }`}
                  >
                    {user.role}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black/30 backdrop-blur-md border-r border-white/10 transition-transform duration-300 pt-[73px] lg:pt-0`}
        >
          <nav className="p-4 space-y-2">
            {userMenuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            {/* Admin section */}
            {isAdmin && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <div className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider">
                    Administration
                  </div>
                  <div className="mt-2 border-t border-amber-500/20" />
                </div>
                {adminMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                      pathname === item.path
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'text-white/70 hover:bg-amber-500/10 hover:text-amber-200'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
