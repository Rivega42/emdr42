import type { Metadata } from 'next';
import { Onest, Spectral } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';

// Пара «Лунной ночи»: Spectral (display, h1/h2) + Onest (текст и UI).
const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-onest',
  display: 'swap',
});

const spectral = Spectral({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-spectral',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'EMDR-AI Therapy Assistant',
    template: '%s | EMDR-AI',
  },
  description:
    'Платформа виртуальной EMDR-терапии с ИИ-ассистентом и распознаванием эмоций.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  applicationName: 'EMDR-AI',
  authors: [{ name: 'EMDR-AI Team' }],
  keywords: ['EMDR', 'therapy', 'PTSD', 'AI therapy', 'trauma', 'mental health'],
  themeColor: '#0a161d',
  viewport: 'width=device-width, initial-scale=1',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${onest.variable} ${spectral.variable}`}>
      <body className="font-sans bg-page text-ink">
        {/* Тема до первой отрисовки (анти-FOUC); отдельный файл — prod CSP
            не разрешает inline-скрипты. По умолчанию ночь, light — opt-in. */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Script
          src="https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/dist/face-api.min.js"
          strategy="afterInteractive"
        />
        {/* Inline скрипт вынесен в /register-sw.js чтобы prod CSP не требовал
            'unsafe-inline' в script-src (XSS hardening). */}
        <Script src="/register-sw.js" strategy="afterInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
