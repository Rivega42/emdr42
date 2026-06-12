import * as React from 'react';

/**
 * Текстовое поле EMDR42 (login/register и формы).
 */
export interface InputProps {
  label?: string;
  /** Текст ошибки; окрашивает рамку в приглушённый danger */
  error?: string;
  /** Подсказка под полем (скрывается при ошибке) */
  hint?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoComplete?: string;
  style?: React.CSSProperties;
}

export declare function Input(props: InputProps): JSX.Element;
