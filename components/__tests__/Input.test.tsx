/**
 * Spec для components/ui/Input (#150) — label + input + error.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Input } from '@/components/ui/Input';

describe('Input (#150)', () => {
  it('рендерит input без label если label не передан', () => {
    render(<Input placeholder="search" />);
    expect(screen.getByPlaceholderText('search')).toBeInTheDocument();
    expect(screen.queryByText(/label/i)).toBeNull();
  });

  it('label связывается с input через htmlFor + id', () => {
    render(<Input label="Email" id="email-field" />);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-field');
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email-field');
  });

  it('error отображается красным текстом', () => {
    render(<Input error="Обязательно поле" />);
    const errText = screen.getByText('Обязательно поле');
    expect(errText).toBeInTheDocument();
    expect(errText.className).toMatch(/text-red-500/);
  });

  it('input получает красную границу при наличии error', () => {
    render(<Input error="err" placeholder="x" />);
    expect(screen.getByPlaceholderText('x').className).toMatch(/border-red-500/);
  });

  it('без error — нейтральная серая граница', () => {
    render(<Input placeholder="x" />);
    expect(screen.getByPlaceholderText('x').className).toMatch(/border-gray-300/);
  });

  it('пробрасывает остальные input-пропсы (type, value, onChange)', async () => {
    const handler = jest.fn();
    render(<Input type="email" value="" onChange={handler} placeholder="email" />);
    const input = screen.getByPlaceholderText('email');
    expect(input).toHaveAttribute('type', 'email');
    await userEvent.setup().type(input, 'a');
    expect(handler).toHaveBeenCalled();
  });

  it('кастомный className конкатенируется к дефолтным классам', () => {
    render(<Input className="custom-cls" placeholder="x" />);
    const input = screen.getByPlaceholderText('x');
    expect(input.className).toMatch(/custom-cls/);
    // дефолтные сохранились
    expect(input.className).toMatch(/w-full/);
  });

  it('disabled пробрасывается', () => {
    render(<Input disabled placeholder="x" />);
    expect(screen.getByPlaceholderText('x')).toBeDisabled();
  });
});
