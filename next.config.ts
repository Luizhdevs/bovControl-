import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Uploads locais em desenvolvimento (qualquer porta: 3000, 3001…)
      {
        protocol: 'http',
        hostname:  'localhost',
        port:      '3001',
        pathname:  '/uploads/**',
      },
      {
        protocol: 'http',
        hostname:  'localhost',
        port:      '3000',
        pathname:  '/uploads/**',
      },
      // Vercel Blob (produção)
      {
        protocol: 'https',
        hostname:  '*.public.blob.vercel-storage.com',
      },
      // Placeholder para dev
      {
        protocol: 'https',
        hostname:  'placehold.co',
      },
    ],
  },
  // Logging de Server Actions em desenvolvimento
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
}

export default nextConfig
