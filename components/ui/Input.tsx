import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/* Поле ввода дизайн-системы «Лунная ночь» (design/components/forms). */
export const Input: React.FC<InputProps> = ({ label, error, id, className = '', ...props }) => (
  <div className="e-field">
    {label && (
      <label htmlFor={id} className="e-field__label">
        {label}
      </label>
    )}
    <input
      id={id}
      className={`e-input ${error ? 'e-input--error' : ''} ${className}`}
      {...props}
    />
    {error && <p className="e-field__error">{error}</p>}
  </div>
);
