/**
 * Spec для EmotionTimeline (#150) — SVG-визуализатор трека эмоций
 * с аннотациями (safety/crisis) и пиками (#240).
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  EmotionTimeline,
  type EmotionPoint,
  type EmotionPeak,
  type TimelineAnnotation,
} from '@/components/ui/EmotionTimeline';

const point = (timestamp: number, over: Partial<EmotionPoint> = {}): EmotionPoint => ({
  timestamp,
  stress: 0.3,
  engagement: 0.5,
  valence: 0.5,
  ...over,
});

describe('EmotionTimeline (#150)', () => {
  it('пустой/один точка → fallback-сообщение «Недостаточно данных»', () => {
    const { rerender } = render(<EmotionTimeline points={[]} />);
    expect(screen.getByText(/недостаточно данных/i)).toBeInTheDocument();

    rerender(<EmotionTimeline points={[point(0)]} />);
    expect(screen.getByText(/недостаточно данных/i)).toBeInTheDocument();
  });

  it('рендерит SVG с тремя линиями (stress/engagement/valence) при ≥2 точках', () => {
    const points = [point(0, { stress: 0.2 }), point(10, { stress: 0.7 })];
    const { container } = render(<EmotionTimeline points={points} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('role', 'img');

    const paths = container.querySelectorAll('path[stroke]');
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it('легенда содержит подписи метрик', () => {
    render(<EmotionTimeline points={[point(0), point(10)]} />);
    expect(screen.getByText(/Стресс/i)).toBeInTheDocument();
    expect(screen.getByText(/Вовлечённость/i)).toBeInTheDocument();
    expect(screen.getByText(/Валентность/i)).toBeInTheDocument();
  });

  it('annotations: метка «События отмечены метками» появляется при annotations.length > 0', () => {
    const points = [point(0), point(60)];
    const annotations: TimelineAnnotation[] = [
      { timestamp: 30, type: 'safety_event', label: 'Stress spike' },
    ];
    const { container, rerender } = render(<EmotionTimeline points={points} />);
    expect(screen.queryByText(/события отмечены/i)).toBeNull();

    rerender(<EmotionTimeline points={points} annotations={annotations} />);
    expect(screen.getByText(/события отмечены/i)).toBeInTheDocument();
    // Маркер должен быть в SVG (circle), tooltip в <title>
    const title = container.querySelector('title');
    expect(title?.textContent).toMatch(/Stress spike/);
  });

  it('annotations: crisis тип красится отличным от safety_event цветом', () => {
    const points = [point(0), point(60)];
    const annotations: TimelineAnnotation[] = [
      { timestamp: 30, type: 'crisis', label: 'Crisis' },
      { timestamp: 45, type: 'safety_event', label: 'Safety' },
    ];
    const { container } = render(<EmotionTimeline points={points} annotations={annotations} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
    const fills = Array.from(circles).map((c) => c.getAttribute('fill'));
    // Цвета разные — crisis (#dc2626) и safety (#f59e0b)
    expect(new Set(fills).size).toBe(2);
  });

  it('peaks: метка «★ — эмоциональные пики» появляется при peaks.length > 0', () => {
    const points = [point(0), point(60)];
    const peaks: EmotionPeak[] = [{ timestamp: 30, metric: 'stress', value: 0.8, prominence: 0.5 }];
    const { container, rerender } = render(<EmotionTimeline points={points} />);
    expect(screen.queryByText(/эмоциональные пики/i)).toBeNull();

    rerender(<EmotionTimeline points={points} peaks={peaks} />);
    expect(screen.getByText(/эмоциональные пики/i)).toBeInTheDocument();
    // Звёздочка — polygon с 10 вершинами
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBe(1);
    const pts = polygons[0].getAttribute('points');
    expect(pts?.split(' ').length).toBe(10);
  });

  it('peaks: tooltip содержит метрику, фазу и SUDS', () => {
    const points = [point(0), point(60)];
    const peaks: EmotionPeak[] = [
      {
        timestamp: 30,
        metric: 'engagement',
        value: 0.85,
        prominence: 0.4,
        phase: 'desensitization',
        nearestSudsValue: 6,
      },
    ];
    const { container } = render(<EmotionTimeline points={points} peaks={peaks} />);
    const title = container.querySelector('polygon title');
    expect(title?.textContent).toMatch(/engagement: 85%/);
    expect(title?.textContent).toMatch(/Phase: desensitization/);
    expect(title?.textContent).toMatch(/SUDS: 6\/10/);
  });

  it('peaks: размер звезды зависит от prominence (radius 4..8)', () => {
    const points = [point(0), point(60)];
    const peaks: EmotionPeak[] = [
      { timestamp: 15, metric: 'stress', value: 0.6, prominence: 0.0 }, // r ~ 4
      { timestamp: 45, metric: 'stress', value: 0.9, prominence: 1.0 }, // r ~ 8
    ];
    const { container } = render(<EmotionTimeline points={points} peaks={peaks} />);
    const polygons = Array.from(container.querySelectorAll('polygon'));
    expect(polygons.length).toBe(2);
    // Извлекаем bbox-ширину по координатам — большая prominence → больше polygon
    const bbox = (poly: SVGPolygonElement): number => {
      const pts = poly
        .getAttribute('points')!
        .split(' ')
        .map((p) => p.split(',').map(Number));
      const xs = pts.map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(bbox(polygons[1] as SVGPolygonElement)).toBeGreaterThan(
      bbox(polygons[0] as SVGPolygonElement),
    );
  });

  it('peaks: цвет различается по метрике (stress=красный, engagement=зелёный, arousal=фиолетовый)', () => {
    const points = [point(0), point(60)];
    const peaks: EmotionPeak[] = [
      { timestamp: 15, metric: 'stress', value: 0.7, prominence: 0.3 },
      { timestamp: 30, metric: 'engagement', value: 0.7, prominence: 0.3 },
      { timestamp: 45, metric: 'arousal', value: 0.7, prominence: 0.3 },
    ];
    const { container } = render(<EmotionTimeline points={points} peaks={peaks} />);
    const polygons = container.querySelectorAll('polygon');
    const fills = Array.from(polygons).map((p) => p.getAttribute('fill'));
    expect(new Set(fills).size).toBe(3);
  });

  it('кастомный className применяется к корневому div', () => {
    const { container } = render(
      <EmotionTimeline points={[point(0), point(10)]} className="custom-cls" />,
    );
    expect(container.firstChild).toHaveClass('custom-cls');
  });
});
