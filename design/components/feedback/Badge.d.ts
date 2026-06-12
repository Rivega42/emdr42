import * as React from 'react';

/**
 * Бейдж EMDR42 — приглушённые статусы.
 */
export interface BadgeProps {
  children: React.ReactNode;
  /** accent — лунный; warm — умбра берега; success/warning/danger — приглушённые состояния */
  variant?: 'default' | 'accent' | 'warm' | 'success' | 'warning' | 'danger';
  style?: React.CSSProperties;
}

export declare function Badge(props: BadgeProps): JSX.Element;
