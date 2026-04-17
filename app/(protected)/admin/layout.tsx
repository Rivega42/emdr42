import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Администрирование',
  description: 'Управление платформой.',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
