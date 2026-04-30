import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Прогресс',
  description: 'История сессий и динамика SUDS/VOC.',
  robots: { index: false, follow: false },
};

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
