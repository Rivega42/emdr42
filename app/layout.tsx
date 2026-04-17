import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
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
  applicationName: 'EMDR-AI',
  authors: [{ name: 'EMDR-AI Team' }],
  keywords: ['EMDR', 'therapy', 'PTSD', 'AI therapy', 'trauma', 'mental health'],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans bg-white text-gray-900">
        <Script
          src="https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/dist/face-api.min.js"
          strategy="afterInteractive"
        />
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
