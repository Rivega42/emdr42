/**
 * Spec для components/ui/Badge (#150) — pill-style status indicator.
 * Классы — дизайн-система «Лунная ночь» (design/components — .e-badge).
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from '@/components/ui/Badge';

describe('Badge (#150)', () => {
  it('рендерит children', () => {
    render(<Badge>active</Badge>);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('по умолчанию variant=default (e-badge без модификатора)', () => {
    render(<Badge>x</Badge>);
    const el = screen.getByText('x');
    expect(el.className).toMatch(/e-badge/);
    expect(el.className).not.toMatch(/e-badge--/);
  });

  it.each([
    ['success', /e-badge--success/],
    ['warning', /e-badge--warning/],
    ['danger', /e-badge--danger/],
    ['accent', /e-badge--accent/],
    ['warm', /e-badge--warm/],
  ] as const)('variant=%s применяет соответствующий модификатор', (variant, expected) => {
    render(<Badge variant={variant}>x</Badge>);
    expect(screen.getByText('x').className).toMatch(expected);
  });

  it('variant=info — синоним accent (легаси-совместимость)', () => {
    render(<Badge variant="info">x</Badge>);
    expect(screen.getByText('x').className).toMatch(/e-badge--accent/);
  });

  it('рендерит span', () => {
    render(<Badge>x</Badge>);
    const el = screen.getByText('x');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toMatch(/e-badge/);
  });
});
