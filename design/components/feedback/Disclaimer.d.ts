import * as React from 'react';

/**
 * Медицинский дисклеймер EMDR42 — тёплая карточка умбры, обязательна под hero.
 */
export interface DisclaimerProps {
  /** Без children рендерится канонический текст с горячими линиями (RU/US/UK/befrienders) */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Disclaimer(props: DisclaimerProps): JSX.Element;
