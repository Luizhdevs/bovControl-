import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Vercel Blob
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
