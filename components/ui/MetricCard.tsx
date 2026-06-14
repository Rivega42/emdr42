import React from 'react';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: 'good' | 'warn' | 'neutral';
  trend?: number[];
  hint?: string;
}

/* Карточка-метрика дизайн-системы «Лунная ночь» (design/components — .e-metric).
   Тон дельты задаётся семантикой (good/warn/neutral), не знаком числа. */
export const MetricCard: React.FC<MetricCardProps> = ({ label, value, delta, deltaTone = 'neutral', trend, hint }) => (
  <div className="e-metric">
    <span className="e-metric__label">{label}</span>
    <div className="e-metric__row">
      <span className="e-metric__value">{value}</span>
      {delta && <span className={`e-metric__delta e-metric__delta--${deltaTone}`}>{delta}</span>}
    </div>
    {trend && trend.length > 1 && <Sparkline data={trend} />}
    {hint && <span className="e-metric__hint">{hint}</span>}
  </div>
);

const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  const w = 120;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="e-metric__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
};
