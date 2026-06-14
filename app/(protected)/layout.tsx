'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, type SidebarSection } from '@/components/ui/Sidebar';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Icon } from '@/components/ui/icons';

/* Личный кабинет в дизайн-системе «Лунная ночь» (design/ui_kits/cabinet).
   Реальные роуты и роль-логика сохранены; визуальный слой — новый. */

const patientItems = [
  { id: '/dashboard', label: 'Главная', icon: 'layout-dashboard' },
  { id: '/session', label: 'Сессия', icon: 'play' },
  { id: '/progress', label: 'Прогресс', icon: 'activity' },
  { id: '/emotion-test', label: 'Тест эмоций', icon: 'eye' },
  { id: '/settings', label: 'Настройки', icon: 'sliders' },
];

const therapistItems = [
  { id: '/patients', label: 'Пациенты', icon: 'users' },
];

const adminItems = [
  { id: '/admin', label: 'Платформа', icon: 'shield' },
  { id: '/admin/users', label: 'Пользователи', icon: 'users' },
  { id: '/admin/settings', label: 'Настройки платформы', icon: 'sliders' },
  { id: '/admin/metrics', label: 'Метрики', icon: 'activity' },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Админ',
  THERAPIST: 'Терапевт',
  PATIENT: 'Пациент',
};

const roleVariants: Record<string, 'accent' | 'success' | 'warm'> = {
  ADMIN: 'warm',
  THERAPIST: 'accent',
  PATIENT: 'success',
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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center" role="status" aria-live="polite">
        <div className="spinner" />
        <span className="sr-only">Загрузка…</span>
      </div>
    );
  }

  const isAdmin = hasRole('ADMIN');
  const isTherapist = hasRole('THERAPIST') || isAdmin;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Активный пункт: точное совпадение либо вложенный admin-роут
  const activeId =
    [...patientItems, ...therapistItems, ...adminItems]
      .map((i) => i.id)
      .filter((id) => pathname === id || (id !== '/admin' && pathname?.startsWith(id + '/')))
      .sort((a, b) => b.length - a.length)[0] ||
    (pathname?.startsWith('/admin') ? '/admin' : pathname || '');

  const toItem = (i: { id: string; label: string; icon: string }) => ({
    id: i.id,
    label: i.label,
    icon: <Icon name={i.icon} />,
    href: i.id,
    onClick: () => setIsSidebarOpen(false),
  });

  const sections: SidebarSection[] = [
    { items: patientItems.map(toItem) },
    ...(isTherapist ? [{ title: 'Терапевт', items: therapistItems.map(toItem) }] : []),
    ...(isAdmin ? [{ title: 'Администрирование', items: adminItems.map(toItem) }] : []),
  ];

  const roleKey = user?.role || 'PATIENT';

  return (
    <div className="c-app">
      <div className={`c-side${isSidebarOpen ? ' c-side--open' : ''}`}>
        <Sidebar
          sections={sections}
          activeId={activeId}
          header={
            <Link href="/dashboard" className="c-side__logo" onClick={() => setIsSidebarOpen(false)}>
              <span className="c-side__logo-mark" aria-hidden="true" />
              <span className="c-side__logo-word">EMDR-AI</span>
            </Link>
          }
          footer={
            <div className="c-side__footer">
              <button type="button" className="e-sidebar__item" onClick={handleLogout}>
                <Icon name="log-out" />
                <span>Выйти</span>
              </button>
            </div>
          }
        />
      </div>
      {isSidebarOpen && (
        <button className="c-scrim" aria-label="Закрыть меню" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="c-main">
        <header className="c-header">
          <div className="c-header__left">
            <button
              className="c-iconbtn c-burger"
              aria-label="Открыть меню"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Icon name="menu" />
            </button>
          </div>
          <div className="c-header__right">
            <ThemeToggle />
            <div className="c-header__user">
              <span className="c-header__name">{user?.name || 'Пользователь'}</span>
              <Badge variant={roleVariants[roleKey] || 'accent'}>{roleLabels[roleKey] || 'Пациент'}</Badge>
            </div>
            <button type="button" className="c-iconbtn" aria-label="Выйти" onClick={handleLogout}>
              <Icon name="log-out" />
            </button>
          </div>
        </header>

        <main className="c-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
