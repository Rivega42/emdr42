'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/session', label: 'New Session', icon: '🧠' },
  { path: '/progress', label: 'Progress', icon: '📊' },
  { path: '/settings', label: 'Settings', icon: '⚙️' }
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
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
              <div className="hidden md:flex items-center space-x-2 text-white/70">
                <span>Welcome,</span>
                <span className="font-semibold text-white">{user?.name || 'User'}</span>
              </div>
              <button onClick={handleLogout} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black/30 backdrop-blur-md border-r border-white/10 transition-transform duration-300`}>
          <nav className="p-4 space-y-2 mt-16 lg:mt-0">
            {menuItems.map(item => (
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
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>

      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}
