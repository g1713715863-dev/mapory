import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true }
    return config
  },
}

export default nextConfig
