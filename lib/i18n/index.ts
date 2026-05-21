'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { en, TranslationKeys } from './en';
import { ru } from './ru';

type Locale = 'en' | 'ru';

const translations: Record<Locale, TranslationKeys> = { en, ru };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('locale') as Locale) || 'en';
    }
    return 'en';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('locale', l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      const keys = key.split('.');
      let value: unknown = translations[locale];
      for (const k of keys) {
        if (value && typeof value === 'object' && k in (value as object)) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }
      if (typeof value !== 'string') return key;
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
      }
      return value;
    },
    [locale],
  );

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, setLocale, t } },
    children
  );
};
