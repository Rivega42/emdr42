/**
 * Spec для components/ui/Button (#150) — базовая кнопка с variant/size/loading.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Button } from '@/components/ui/Button';

describe('Button (#150)', () => {
  it('рендерит children', () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('по умолчанию variant=primary, size=md', () => {
    render(<Button>X</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-gray-900/);
    expect(btn.className).toMatch(/px-5 py-2.5/);
  });

  it('variant=danger применяет красные классы', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-red-600/);
  });

  it('variant=secondary применяет серые классы', () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-gray-100/);
  });

  it('size=sm и size=lg применяют разные padding', () => {
    const { rerender } = render(<Button size="sm">X</Button>);
    expect(screen.getByRole('button').className).toMatch(/px-3 py-1.5/);
    rerender(<Button size="lg">X</Button>);
    expect(screen.getByRole('button').className).toMatch(/px-8 py-4/);
  });

  it('onClick вызывается при клике', async () => {
    const handler = jest.fn();
    render(<Button onClick={handler}>Click</Button>);
    await userEvent.setup().click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('disabled блокирует click и устанавливает атрибут', async () => {
    const handler = jest.fn();
    render(
      <Button disabled onClick={handler}>
        X
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.setup().click(btn);
    expect(handler).not.toHaveBeenCalled();
  });

  it('loading=true → disabled + спиннер виден', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // Спиннер — span с animate-spin
    const spinner = btn.querySelector('span.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('loading=false → нет спиннера', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button').querySelector('span.animate-spin')).toBeNull();
  });
});
