import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Пациенты',
  description: 'Управление списком пациентов (для терапевтов).',
  robots: { index: false, follow: false },
};

export default function PatientsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
