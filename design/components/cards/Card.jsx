import React from 'react';

/**
 * Карточка-поверхность со «светом луны на ребре» (светлая кромка сверху).
 * FeatureCard-режим: icon + title + text.
 */
export function Card({ icon, title, children, hoverable = true, style }) {
  return (
    <div className={`e-card${hoverable ? ' e-card--hoverable' : ''}`} style={style}>
      {icon && <div className="e-card__icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="e-card__title">{title}</h3>}
      {typeof children === 'string' ? (
        <p className="e-card__text">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}
