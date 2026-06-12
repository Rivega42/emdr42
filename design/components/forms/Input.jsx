import React from 'react';

/**
 * Текстовое поле с лейблом, подсказкой и состоянием ошибки.
 * Фокус — лунный акцент, всегда видимый.
 */
export function Input({
  label,
  error,
  hint,
  id,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  disabled = false,
  autoComplete,
  style,
}) {
  const inputId = id || (label ? `e-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className="e-field" style={style}>
      {label && (
        <label className="e-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`e-input${error ? ' e-input--error' : ''}`}
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
      />
      {error && <p className="e-field__error" role="alert">{error}</p>}
      {!error && hint && <p className="e-field__hint">{hint}</p>}
    </div>
  );
}
