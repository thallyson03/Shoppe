import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Proxy /backend → API fica em app/backend/[...path]/route.ts (runtime API_URL)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.shopee.com.br' },
      { protocol: 'https', hostname: '**.shopeecdn.com' },
      { protocol: 'https', hostname: 'cf.shopee.com.br' },
      { protocol: 'https', hostname: 'down-br.img.susercontent.com' },
      { protocol: 'https', hostname: '**.susercontent.com' },
    ],
  },
};

export default nextConfig;
