import React from 'react';

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

/* Переключатель настроек дизайн-системы «Лунная ночь» (design/components — .e-switch). */
export const Switch: React.FC<SwitchProps> = ({ label, description, checked, onChange, disabled = false }) => (
  <div className="e-switch-row">
    <div>
      <div className="e-switch-row__label">{label}</div>
      {description && <div className="e-switch-row__desc">{description}</div>}
    </div>
    <button
      type="button"
      className="e-switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
    />
  </div>
);
