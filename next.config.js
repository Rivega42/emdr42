/** @type {import('next').NextConfig} */

// Pre-build validation: в production-сборке требуем явные публичные URL.
// Без них дефолты пойдут в build-артефакт → email-ссылки укажут на vercel.app
// и `connect-src` CSP заблокирует prod-домен.
if (process.env.NODE_ENV === 'production' && process.env.CI !== 'true') {
  const required = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[build] Missing required public env vars: ${missing.join(', ')}. ` +
        `Defaults будут включены в build — ссылки могут указывать на vercel.app.`,
    );
  }
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8002';
const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

// CSP — строгая политика, совместимая с Next.js + Three.js + LiveKit + face-api
// В dev режиме разрешаем unsafe-eval (needed by Next.js fast refresh)
const isDev = process.env.NODE_ENV !== 'production';

const buildCsp = () => {
  // В production убираем 'unsafe-inline' из script-src — без этого XSS становится
  // полноценным (любой inline-tag выполняется). Inline-скрипты вынесены в
  // отдельные файлы (например public/register-sw.js).
  // 'unsafe-inline' для style-src оставляем — Tailwind + framer-motion ставят
  // inline-style runtime'ом; nonce-based замена — задача отдельного спринта.
  const parts = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      // face-api.js и веса теперь self-hosted (public/vendor, public/models) —
      // внешний CDN (jsdelivr) из CSP убран. Раньше веса грузились fetch'ем с
      // jsdelivr, но connect-src его не содержал → инференс эмоций не стартовал.
      'blob:', // Web workers
    ],
    'style-src': ["'self'", "'unsafe-inline'"], // Tailwind inline + next/font
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      apiUrl,
      wsUrl,
      wsUrl.replace(/^http/, 'ws'),
      'https://api.anthropic.com',
      'https://api.openai.com',
      'https://api.deepgram.com',
      'https://api.elevenlabs.io',
      ...(liveKitUrl ? [liveKitUrl, liveKitUrl.replace(/^https/, 'wss')] : []),
      'wss:',
      'blob:',
    ],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
  };
  return Object.entries(parts)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
};

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@emdr42/core'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: buildCsp() },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://emdr42.vercel.app',
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_WS_URL: wsUrl,
  },
  webpack: (config) => {
    config.externals.push({
      bufferutil: 'commonjs bufferutil',
      'utf-8-validate': 'commonjs utf-8-validate',
    });
    return config;
  },
};

module.exports = nextConfig;
