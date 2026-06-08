import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Панель управления',
  description: 'Обзор сессий и прогресса.',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
