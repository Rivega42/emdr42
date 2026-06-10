/**
 * Spec для components/ui/Badge (#150) — pill-style status indicator.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from '@/components/ui/Badge';

describe('Badge (#150)', () => {
  it('рендерит children', () => {
    render(<Badge>active</Badge>);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('по умолчанию variant=default (серый)', () => {
    render(<Badge>x</Badge>);
    expect(screen.getByText('x').className).toMatch(/bg-gray-100/);
  });

  it.each([
    ['success', /bg-green-50/],
    ['warning', /bg-amber-50/],
    ['danger', /bg-red-50/],
    ['info', /bg-blue-50/],
  ] as const)('variant=%s применяет соответствующий цвет', (variant, expected) => {
    render(<Badge variant={variant}>x</Badge>);
    expect(screen.getByText('x').className).toMatch(expected);
  });

  it('span с rounded-full и border', () => {
    render(<Badge>x</Badge>);
    const el = screen.getByText('x');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toMatch(/rounded-full/);
    expect(el.className).toMatch(/border/);
  });
});
