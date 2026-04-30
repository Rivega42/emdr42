'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTrpcClient } from '@/lib/trpc';
import { AuthProvider } from '@/contexts/AuthContext';
import { EmotionProvider } from '@/contexts/EmotionContext';
import { TherapyProvider } from '@/contexts/TherapyContext';
import { I18nProvider } from '@/lib/i18n';
import { CrisisBanner } from '@/components/ui/CrisisBanner';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <EmotionProvider>
              <TherapyProvider>
                {children}
                {/* #147 — всегда доступная кризис-кнопка в правом нижнем углу */}
                <CrisisBanner />
              </TherapyProvider>
            </EmotionProvider>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
