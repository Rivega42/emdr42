import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'EMDR-AI Therapy Assistant',
  description: 'Revolutionary virtual therapy platform combining EMDR techniques with AI-powered emotion recognition',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-white text-gray-900">
        <Script
          src="https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/dist/face-api.min.js"
          strategy="beforeInteractive"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
