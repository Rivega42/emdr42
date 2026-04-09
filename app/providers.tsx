'use client';

import React from 'react';
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
  );
}
