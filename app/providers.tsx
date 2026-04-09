'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { EmotionProvider } from '@/contexts/EmotionContext';
import { TherapyProvider } from '@/contexts/TherapyContext';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <EmotionProvider>
        <TherapyProvider>
          {children}
        </TherapyProvider>
      </EmotionProvider>
    </AuthProvider>
  );
};
