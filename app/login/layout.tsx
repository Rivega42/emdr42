import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход',
  description: 'Войдите в аккаунт EMDR-AI Therapy Assistant.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
