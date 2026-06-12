import * as React from 'react';

/**
 * Кнопка EMDR42.
 */
export interface ButtonProps {
  children: React.ReactNode;
  /** primary — лунный акцент с ореолом (макс. 1–2 на экран); secondary — поверхность; ghost — прозрачная; danger — приглушённый, только для необратимых действий */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Показывает спиннер и блокирует кнопку */
  loading?: boolean;
  /** Если задан — рендерится как <a> */
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}

export declare function Button(props: ButtonProps): JSX.Element;
