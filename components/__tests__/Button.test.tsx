/**
 * Spec для components/ui/Button (#150) — базовая кнопка с variant/size/loading.
 * Классы — дизайн-система «Лунная ночь» (design/components/buttons).
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
    expect(btn.className).toMatch(/e-btn--primary/);
    expect(btn.className).toMatch(/e-btn--md/);
  });

  it('variant=danger применяет danger-классы', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button').className).toMatch(/e-btn--danger/);
  });

  it('variant=secondary применяет secondary-классы', () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button').className).toMatch(/e-btn--secondary/);
  });

  it('size=sm и size=lg применяют разные классы размера', () => {
    const { rerender } = render(<Button size="sm">X</Button>);
    expect(screen.getByRole('button').className).toMatch(/e-btn--sm/);
    rerender(<Button size="lg">X</Button>);
    expect(screen.getByRole('button').className).toMatch(/e-btn--lg/);
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
    // Спиннер — span с e-btn__spinner
    const spinner = btn.querySelector('span.e-btn__spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('loading=false → нет спиннера', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button').querySelector('span.e-btn__spinner')).toBeNull();
  });
});
