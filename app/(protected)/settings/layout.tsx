import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Настройки',
  description: 'Настройки профиля, приватности и терапии.',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
