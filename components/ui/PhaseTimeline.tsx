import React from 'react';

export const EMDRIA_PHASES = [
  'Анамнез',
  'Подготовка',
  'Оценка',
  'Десенсибилизация',
  'Инсталляция',
  'Сканирование тела',
  'Завершение',
  'Переоценка',
];

export interface PhaseTimelineProps {
  current?: number;
  phases?: string[];
  compact?: boolean;
}

/* Таймлайн 8 фаз протокола EMDRIA (design/components — .e-phases).
   Текущая фаза — единственный светящийся элемент таймлайна. */
export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({ current = 0, phases = EMDRIA_PHASES, compact = false }) => (
  <div className={`e-phases${compact ? ' e-phases--compact' : ''}`} role="list" aria-label="Фазы протокола EMDRIA">
    {phases.map((p, i) => {
      const state = i < current ? 'done' : i === current ? 'current' : 'future';
      return (
        <div
          key={p}
          role="listitem"
          aria-current={state === 'current' ? 'step' : undefined}
          className={`e-phases__step${state !== 'future' ? ` e-phases__step--${state}` : ''}`}
          title={`${i + 1}. ${p}`}
        >
          <span className="e-phases__dot" aria-hidden="true" />
          <span className="e-phases__label">
            <span className="e-phases__num">{i + 1}</span>
            <br />
            {p}
          </span>
        </div>
      );
    })}
  </div>
);
