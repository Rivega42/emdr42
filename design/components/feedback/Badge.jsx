import React from 'react';

/**
 * Бейдж-пилюля. Все варианты приглушённые — никаких кричащих статусов.
 */
export function Badge({ children, variant = 'default', style }) {
  const cls = variant === 'default' ? 'e-badge' : `e-badge e-badge--${variant}`;
  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}
