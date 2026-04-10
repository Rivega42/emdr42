'use client';

import React from 'react';
<<<<<<< HEAD
import { AuthProvider } from '@/contexts/AuthContext';
import { EmotionProvider } from '@/contexts/EmotionContext';
import { TherapyProvider } from '@/contexts/TherapyContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EmotionProvider>
        <TherapyProvider>
          {children}
        </TherapyProvider>
      </EmotionProvider>
    </AuthProvider>
=======
import { I18nProvider } from '@/lib/i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
>>>>>>> origin/feature/i18n-email-gdpr
  );
}
