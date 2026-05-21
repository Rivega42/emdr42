'use client';

import React, { useMemo } from 'react';

/**
 * EmotionTimeline (#80).
 *
 * Lightweight SVG line chart без внешних dependencies (recharts добавить
 * позже, когда понадобится интерактивность).
 *
 * Показывает:
 *   - Stress (красная линия)
 *   - Engagement (зелёная)
 *   - Valence (синяя, центрирована по 0.5)
 *   - Аннотации timeline events (safety, phase changes, SUDS submissions)
 */

export interface EmotionPoint {
  timestamp: number; // seconds from session start
  stress: number;    // 0-1
  engagement: number; // 0-1
  valence: number;   // 0-1 (был -1..1, здесь нормализован)
}

export interface TimelineAnnotation {
  timestamp: number;
  type: 'phase_change' | 'safety_event' | 'suds' | 'voc' | 'interweave' | 'crisis';
  label: string;
}

interface EmotionTimelineProps {
  points: EmotionPoint[];
  annotations?: TimelineAnnotation[];
  height?: number;
  className?: string;
}

const COLOR = {
  stress: '#ef4444',
  engagement: '#22c55e',
  valence: '#3b82f6',
  annotationDefault: '#6b7280',
  annotationCrisis: '#dc2626',
  annotationSafety: '#f59e0b',
  grid: '#e5e7eb',
};

const PAD = { top: 20, right: 20, bottom: 40, left: 40 };

export const EmotionTimeline: React.FC<EmotionTimelineProps> = ({
  points,
  annotations = [],
  height = 280,
  className = '',
}) => {
  const layout = useMemo(() => {
    if (points.length < 2) return null;

    const width = 800;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const minT = points[0].timestamp;
    const maxT = points[points.length - 1].timestamp;
    const rangeT = Math.max(maxT - minT, 1);

    const xScale = (t: number) => PAD.left + ((t - minT) / rangeT) * innerW;
    const yScale = (v: number) => PAD.top + (1 - v) * innerH;

    const buildPath = (key: 'stress' | 'engagement' | 'valence') =>
      points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.timestamp).toFixed(1)},${yScale(p[key]).toFixed(1)}`)
        .join(' ');

    return {
      width,
      innerW,
      innerH,
      xScale,
      yScale,
      paths: {
        stress: buildPath('stress'),
        engagement: buildPath('engagement'),
        valence: buildPath('valence'),
      },
    };
  }, [points, height]);

  if (!layout) {
    return (
      <div className={`flex items-center justify-center h-40 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-sm text-gray-400">Недостаточно данных для графика</p>
      </div>
    );
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={className}>
      {/* Легенда */}
      <div className="flex flex-wrap gap-4 mb-2 text-xs text-gray-600">
        <LegendDot color={COLOR.stress} label="Стресс" />
        <LegendDot color={COLOR.engagement} label="Вовлечённость" />
        <LegendDot color={COLOR.valence} label="Валентность" />
        {annotations.length > 0 && (
          <span className="text-gray-400">· События отмечены метками</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${layout.width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="График эмоций в реальном времени"
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={layout.width - PAD.right}
              y1={layout.yScale(v)}
              y2={layout.yScale(v)}
              stroke={COLOR.grid}
              strokeDasharray={v === 0.5 ? '0' : '2 3'}
            />
            <text
              x={PAD.left - 6}
              y={layout.yScale(v) + 3}
              fontSize="10"
              textAnchor="end"
              fill="#9ca3af"
            >
              {v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X-axis labels (start/middle/end time) */}
        {points.length > 0 && (
          <>
            <text x={PAD.left} y={height - PAD.bottom + 14} fontSize="10" fill="#9ca3af">
              {formatTime(points[0].timestamp)}
            </text>
            <text
              x={layout.width / 2}
              y={height - PAD.bottom + 14}
              fontSize="10"
              fill="#9ca3af"
              textAnchor="middle"
            >
              {formatTime((points[0].timestamp + points[points.length - 1].timestamp) / 2)}
            </text>
            <text
              x={layout.width - PAD.right}
              y={height - PAD.bottom + 14}
              fontSize="10"
              fill="#9ca3af"
              textAnchor="end"
            >
              {formatTime(points[points.length - 1].timestamp)}
            </text>
          </>
        )}

        {/* Lines */}
        <path d={layout.paths.stress} stroke={COLOR.stress} strokeWidth="2" fill="none" />
        <path
          d={layout.paths.engagement}
          stroke={COLOR.engagement}
          strokeWidth="2"
          fill="none"
        />
        <path
          d={layout.paths.valence}
          stroke={COLOR.valence}
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 2"
          opacity="0.7"
        />

        {/* Annotations — вертикальные линии с tooltip */}
        {annotations.map((a, i) => {
          const color =
            a.type === 'crisis'
              ? COLOR.annotationCrisis
              : a.type === 'safety_event'
                ? COLOR.annotationSafety
                : COLOR.annotationDefault;
          return (
            <g key={i}>
              <line
                x1={layout.xScale(a.timestamp)}
                x2={layout.xScale(a.timestamp)}
                y1={PAD.top}
                y2={height - PAD.bottom}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle
                cx={layout.xScale(a.timestamp)}
                cy={PAD.top - 4}
                r="4"
                fill={color}
              >
                <title>{`${formatTime(a.timestamp)} — ${a.label}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
    {label}
  </span>
);
