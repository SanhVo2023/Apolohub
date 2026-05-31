import dns from 'node:dns'
import type { NextConfig } from 'next'
import { withPayload } from '@payloadcms/next/withPayload'

// IPv4 first — Supabase resolves to IPv6 on some networks. Must run before any DB connection.
dns.setDefaultResultOrder('ipv4first')

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        // R2 CDN — image host for all sites. The hub stores/references R2 URLs.
        protocol: 'https',
        hostname: 'pub-ebe397ad6fc946888f5c9aacc3cc48bb.r2.dev',
        pathname: '/**',
      },
    ],
  },
}

export default withPayload(nextConfig)
