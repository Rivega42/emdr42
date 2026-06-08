import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EMDR-сессия',
  description: 'AI-ассистируемая EMDR-сессия с билатеральной стимуляцией.',
  robots: { index: false, follow: false },
};

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
