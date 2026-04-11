'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const userMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/session', label: 'New Session', icon: '🧠' },
  { path: '/progress', label: 'Progress', icon: '📊' },
  { path: '/emotion-test', label: 'Emotion Test', icon: '🎭' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

const therapistMenuItems = [
  { path: '/patients', label: 'My Patients', icon: '👤' },
];

const adminMenuItems = [
  { path: '/admin', label: 'Admin Dashboard', icon: '🛡️' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/settings', label: 'Platform Settings', icon: '🔧' },
  { path: '/admin/metrics', label: 'Metrics', icon: '📈' },
];

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-amber-50 text-amber-700 border-amber-200',
  THERAPIST: 'bg-blue-50 text-blue-700 border-blue-200',
  PATIENT: 'bg-green-50 text-green-700 border-green-200',
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const isAdmin = hasRole('ADMIN');
  const isTherapist = hasRole('THERAPIST') || isAdmin;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🧠</span>
                </div>
                <span className="text-xl font-bold text-gray-900">EMDR-AI</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 text-gray-500">
                <span>Welcome,</span>
                <span className="font-semibold text-gray-900">{user?.name || 'User'}</span>
                {user?.role && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      roleBadgeColors[user.role] || 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {user.role}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
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
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 pt-[73px] lg:pt-0`}
        >
          <nav className="p-4 space-y-1">
            {userMenuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === item.path
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            {isTherapist && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Therapist</div>
                  <div className="mt-2 border-t border-gray-200" />
                </div>
                {therapistMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      pathname === item.path || pathname?.startsWith(item.path + '/')
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </>
            )}

            {isAdmin && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</div>
                  <div className="mt-2 border-t border-gray-200" />
                </div>
                {adminMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      pathname === item.path
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
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

      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
