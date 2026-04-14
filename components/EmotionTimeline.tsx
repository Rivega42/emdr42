'use client';

import React, { useMemo } from 'react';

interface EmotionPoint {
  timestamp: number;
  stress: number;
  engagement: number;
  valence: number;
}

interface TimelineMarker {
  timestamp: number;
  type: 'patient' | 'ai' | 'phase' | 'safety' | 'suds' | 'voc';
  label: string;
  value?: number;
}

interface EmotionTimelineProps {
  emotions: EmotionPoint[];
  markers?: TimelineMarker[];
  startTime: number;
  width?: number;
  height?: number;
}

const COLORS = {
  stress: '#ef4444',
  engagement: '#22c55e',
  valence: '#3b82f6',
  patient: '#9ca3af',
  ai: '#60a5fa',
  phase: '#a855f7',
  safety: '#ef4444',
  suds: '#f59e0b',
  voc: '#10b981',
};

export const EmotionTimeline: React.FC<EmotionTimelineProps> = ({
  emotions,
  markers = [],
  startTime,
  width = 800,
  height = 300,
}) => {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { paths, timeRange } = useMemo(() => {
    if (emotions.length === 0) return { paths: { stress: '', engagement: '', valence: '' }, timeRange: 0 };

    const maxTime = Math.max(...emotions.map((e) => e.timestamp));
    const range = (maxTime - startTime) / 1000; // seconds

    const toX = (ts: number) => ((ts - startTime) / 1000 / (range || 1)) * chartW;
    const toY = (val: number) => chartH - val * chartH;

    const makePath = (key: keyof Pick<EmotionPoint, 'stress' | 'engagement' | 'valence'>) => {
      return emotions
        .map((e, i) => `${i === 0 ? 'M' : 'L'} ${toX(e.timestamp)} ${toY(e[key])}`)
        .join(' ');
    };

    return {
      paths: {
        stress: makePath('stress'),
        engagement: makePath('engagement'),
        valence: makePath('valence'),
      },
      timeRange: range,
    };
  }, [emotions, startTime, chartW, chartH]);

  const toX = (ts: number) => {
    const range = timeRange || 1;
    return ((ts - startTime) / 1000 / range) * chartW;
  };

  if (emotions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Emotion data will appear here during the session.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="bg-gray-900/50 rounded-lg">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={0} y1={chartH - v * chartH} x2={chartW} y2={chartH - v * chartH} stroke="#374151" strokeDasharray="4" />
              <text x={-8} y={chartH - v * chartH + 4} textAnchor="end" fill="#9ca3af" fontSize={10}>{v.toFixed(1)}</text>
            </g>
          ))}

          {/* Marker lines */}
          {markers.map((m, i) => {
            const x = toX(m.timestamp);
            if (x < 0 || x > chartW) return null;
            return (
              <g key={i}>
                <line
                  x1={x} y1={0} x2={x} y2={chartH}
                  stroke={COLORS[m.type] || '#666'}
                  strokeWidth={m.type === 'safety' ? 2 : 1}
                  strokeDasharray={m.type === 'phase' ? '6,3' : undefined}
                  opacity={0.6}
                />
                {m.value !== undefined && (
                  <circle cx={x} cy={chartH - (m.value / 10) * chartH} r={4} fill={COLORS[m.type]} />
                )}
              </g>
            );
          })}

          {/* Emotion lines */}
          <path d={paths.stress} fill="none" stroke={COLORS.stress} strokeWidth={2} opacity={0.8} />
          <path d={paths.engagement} fill="none" stroke={COLORS.engagement} strokeWidth={2} opacity={0.8} />
          <path d={paths.valence} fill="none" stroke={COLORS.valence} strokeWidth={2} opacity={0.8} />

          {/* X-axis */}
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#4b5563" />

          {/* Time labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <text key={frac} x={frac * chartW} y={chartH + 20} textAnchor="middle" fill="#9ca3af" fontSize={10}>
              {Math.round(frac * timeRange)}s
            </text>
          ))}
        </g>

        {/* Legend */}
        <g transform={`translate(${padding.left}, ${height - 12})`}>
          {[
            { label: 'Stress', color: COLORS.stress },
            { label: 'Engagement', color: COLORS.engagement },
            { label: 'Valence', color: COLORS.valence },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${i * 110}, 0)`}>
              <rect width={12} height={3} fill={item.color} y={-2} />
              <text x={16} y={2} fill="#9ca3af" fontSize={10}>{item.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
