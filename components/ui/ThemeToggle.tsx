'use client';

import React, { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './icons';

const STORAGE_KEY = 'emdr42-theme';

/**
 * Переключатель тем «Лунной ночи»: ночь (по умолчанию, :root) ⇄ рассвет
 * ([data-theme="light"]). Начальное значение выставляет public/theme-init.js
 * до первой отрисовки, поэтому здесь читаем уже применённый атрибут.
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.getAttribute('data-theme') === 'light');
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'light' : 'night');
    } catch {
      // private mode — тема не переживёт перезагрузку, и ладно
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-ink border border-line hover:border-line-strong rounded-full transition-colors ${className}`}
      aria-label={light ? 'Включить тёмную тему' : 'Включить светлую тему'}
    >
      {light ? <MoonIcon /> : <SunIcon />}
      <span className="hidden sm:inline">{light ? 'Ночь' : 'Рассвет'}</span>
    </button>
  );
};
