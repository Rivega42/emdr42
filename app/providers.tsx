'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { EmotionProvider } from '@/contexts/EmotionContext';
import { TherapyProvider } from '@/contexts/TherapyContext';
import { I18nProvider } from '@/lib/i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <EmotionProvider>
          <TherapyProvider>
            {children}
          </TherapyProvider>
        </EmotionProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
