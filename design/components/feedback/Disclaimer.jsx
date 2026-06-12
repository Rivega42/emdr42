import React from 'react';

/**
 * Медицинский дисклеймер — обязательный смысловой якорь доверия.
 * Спокойная «тёплая» карточка (умбра/охра берега): заметная, но не тревожная.
 */
export function Disclaimer({ children, style }) {
  return (
    <div className="e-disclaimer" role="note" style={style}>
      <span className="e-disclaimer__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
        </svg>
      </span>
      <div>
        {children || (
          <>
            <strong>Важно:</strong> EMDR-AI — вспомогательный инструмент и не заменяет
            профессиональную психотерапевтическую помощь. В кризисной ситуации звоните:{' '}
            RU <strong>8-800-2000-122</strong> · US <strong>988</strong> · UK <strong>116 123</strong> ·{' '}
            <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer">befrienders.org</a>.
          </>
        )}
      </div>
    </div>
  );
}
