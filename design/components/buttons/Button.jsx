import React from 'react';

/**
 * Кнопка EMDR42. Primary — единственный «светящийся» элемент
 * (ореол лунного света через box-shadow, не неон).
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  href,
  onClick,
  type = 'button',
  style,
}) {
  const className = `e-btn e-btn--${variant} e-btn--${size}`;
  const inner = (
    <>
      {loading && <span className="e-btn__spinner" aria-hidden="true"></span>}
      {children}
    </>
  );
  if (href && !disabled) {
    return (
      <a className={className} href={href} onClick={onClick} style={style}>
        {inner}
      </a>
    );
  }
  return (
    <button
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      style={style}
    >
      {inner}
    </button>
  );
}
