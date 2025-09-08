/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['morphcast.com', 'localhost'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self)'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  env: {
    NEXT_PUBLIC_MORPHCAST_KEY: process.env.MORPHCAST_LICENSE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://emdr42.vercel.app',
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'wss://emdr42.vercel.app'
  }
}

module.exports = nextConfig