import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Регистрация',
  description: 'Создайте аккаунт EMDR-AI для начала терапевтических сессий.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
