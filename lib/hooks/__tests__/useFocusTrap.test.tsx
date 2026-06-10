import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { useFocusTrap } from '../useFocusTrap';

const TestDialog: React.FC<{
  open: boolean;
  onEscape?: () => void;
}> = ({ open, onEscape }) => {
  const ref = useFocusTrap<HTMLDivElement>(open, onEscape);
  if (!open) return <button data-testid="trigger">Open</button>;
  return (
    <div ref={ref} role="dialog" aria-modal="true" data-testid="dialog">
      <button data-testid="first">First</button>
      <button data-testid="middle">Middle</button>
      <button data-testid="last">Last</button>
    </div>
  );
};

describe('useFocusTrap (#109)', () => {
  it('фокус циклится с last → first при Tab', () => {
    render(<TestDialog open />);
    screen.getByTestId('last').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('first'));
  });

  it('фокус циклится с first → last при Shift+Tab', () => {
    render(<TestDialog open />);
    screen.getByTestId('first').focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByTestId('last'));
  });

  it('Escape вызывает onEscape', () => {
    const onEscape = jest.fn();
    render(<TestDialog open onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('без onEscape — Escape игнорируется (модалка не закрывается случайно)', () => {
    render(<TestDialog open />);
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });

  it('возвращает фокус на исходный элемент при размонтировании', () => {
    const Wrapper: React.FC = () => {
      const [open, setOpen] = useState(false);
      const ref = useFocusTrap<HTMLDivElement>(open, () => setOpen(false));
      return (
        <>
          <button data-testid="opener" onClick={() => setOpen(true)}>
            Open
          </button>
          {open && (
            <div ref={ref} role="dialog" data-testid="dialog2">
              <button data-testid="dialog-first">D1</button>
              <button data-testid="dialog-last">D2</button>
            </div>
          )}
        </>
      );
    };
    render(<Wrapper />);
    const trigger = screen.getByTestId('opener');
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });

  it('не активирует трап если active=false', () => {
    const onEscape = jest.fn();
    render(<TestDialog open={false} onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});
