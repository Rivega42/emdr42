import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Восстановление пароля',
  description: 'Сброс пароля через email.',
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
