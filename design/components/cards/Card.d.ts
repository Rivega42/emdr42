import * as React from 'react';

/**
 * Карточка EMDR42 — поверхность со светлой кромкой сверху («свет луны на ребре»).
 */
export interface CardProps {
  /** SVG-иконка (lucide, штрих 1.5px) — рендерится в акцентном контейнере 44×44 */
  icon?: React.ReactNode;
  title?: string;
  /** Строка станет приглушённым текстом карточки; узлы рендерятся как есть */
  children?: React.ReactNode;
  /** hover мягко усиливает кромку (по умолчанию true) */
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export declare function Card(props: CardProps): JSX.Element;
