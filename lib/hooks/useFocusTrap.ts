'use client';

import { useEffect, useRef } from 'react';

/**
 * Минимальный focus-trap (#109) — без внешних зависимостей.
 *
 * При активации (`active === true`):
 *  - запоминает предыдущий focused element
 *  - фокус циклится между первым и последним focusable внутри ref-контейнера
 *  - Esc вызывает `onEscape` (если задан)
 *  - при деактивации возвращает фокус на предыдущий элемент
 *
 * Использование:
 *   const ref = useFocusTrap<HTMLDivElement>(isOpen, onClose);
 *   return <div ref={ref} role="dialog">…</div>;
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled'),
      );

    // autoFocus на первой кнопке уже выставлен в модалках; на случай отсутствия —
    // ставим фокус явно, чтобы трап имел якорь.
    const focused = document.activeElement as HTMLElement | null;
    if (!focused || !container.contains(focused)) {
      focusables()[0]?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Возврат фокуса на инициатора (если ещё в DOM).
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, onEscape]);

  return ref;
}
