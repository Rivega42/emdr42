import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Подписка',
  description: 'Управление подпиской и оплатой',
  robots: { index: false, follow: false },
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
