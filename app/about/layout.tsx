import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'О EMDR',
  description: 'Что такое EMDR-терапия и как работает наш AI-ассистент.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
