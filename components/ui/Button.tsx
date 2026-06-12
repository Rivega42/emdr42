import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

/* Кнопка дизайн-системы «Лунная ночь» (design/components/buttons).
   primary — единственный «светящийся» элемент: ореол, не неон. */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
}) => (
  <button
    className={`e-btn e-btn--${variant} e-btn--${size}`}
    disabled={disabled || loading}
    onClick={onClick}
  >
    {loading && <span className="e-btn__spinner" aria-hidden="true" />}
    {children}
  </button>
);
