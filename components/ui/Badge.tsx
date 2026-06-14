import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'warm' | 'info';
}

/* Бейдж-пилюля дизайн-системы «Лунная ночь» (design/components — .e-badge).
   Все варианты приглушённые. 'info' — синоним 'accent' (легаси-совместимость). */
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const v = variant === 'info' ? 'accent' : variant;
  const cls = v === 'default' ? 'e-badge' : `e-badge e-badge--${v}`;
  return <span className={cls}>{children}</span>;
};
