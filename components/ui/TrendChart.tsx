import React from 'react';

export interface TrendSeries {
  name: string;
  data: (number | null)[];
  tone?: 'accent' | 'warm';
}

export interface TrendChartProps {
  labels?: string[];
  series?: TrendSeries[];
  yMax?: number;
  yTicks?: number[];
  height?: number;
  emptyText?: string;
  legend?: boolean;
}

/* Линейный график SUDS/VOC дизайн-системы «Лунная ночь» (design/components — .e-chart).
   Сетка едва видима, линия — лунный акцент; вторая серия — тёплая умбра.
   Рост тревоги никогда не красится «кричащим красным». */
export const TrendChart: React.FC<TrendChartProps> = ({
  labels = [],
  series = [],
  yMax = 10,
  yTicks = [0, 5, 10],
  height = 220,
  emptyText = 'Данных пока нет. Они появятся после первой сессии.',
  legend = true,
}) => {
  const hasData = series.some((s) => (s.data || []).filter((v) => v != null).length > 1);
  if (!hasData) {
    return (
      <div className="e-chart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <span>{emptyText}</span>
      </div>
    );
  }

  const w = 720;
  const h = height;
  const pad = { top: 14, right: 16, bottom: 28, left: 34 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const n = labels.length;
  const x = (i: number) => pad.left + (n > 1 ? (i / (n - 1)) * iw : iw / 2);
  const y = (v: number) => pad.top + ih - (v / yMax) * ih;

  const lineCls = (tone?: string) => `e-chart__line${tone === 'warm' ? ' e-chart__line--warm' : ''}`;
  const dotCls = (tone?: string) => `e-chart__dot${tone === 'warm' ? ' e-chart__dot--warm' : ''}`;

  return (
    <div>
      <svg className="e-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={series.map((s) => s.name).join(', ')}>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="e-chart__grid" x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} />
            <text className="e-chart__axis" x={pad.left - 8} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {labels.map((lab, i) => (lab ? (
          <text key={i} className="e-chart__axis" x={x(i)} y={h - 8} textAnchor="middle">{lab}</text>
        ) : null))}
        {series.map((s, si) => {
          const pts = (s.data || [])
            .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
            .filter(Boolean)
            .join(' ');
          return (
            <g key={s.name || si}>
              <polyline className={lineCls(s.tone)} points={pts} />
              {(s.data || []).map((v, i) => (v == null ? null : (
                <circle key={i} className={dotCls(s.tone)} cx={x(i)} cy={y(v)} r="3" />
              )))}
            </g>
          );
        })}
      </svg>
      {legend && series.length > 1 && (
        <div className="e-chart-legend">
          {series.map((s, si) => (
            <span key={s.name || si} className="e-chart-legend__item">
              <span className={`e-chart-legend__swatch${s.tone === 'warm' ? ' e-chart-legend__swatch--warm' : ''}`} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
