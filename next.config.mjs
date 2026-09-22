/** @type {import('next').NextConfig} */
const supabaseHost = 'grnxxhhiugvcehajfeaf.supabase.co';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    // إغلاق التحقق من أخطاء TypeScript أثناء الـ Build
    ignoreBuildErrors: true,
  },
  eslint: {
    // إغلاق التحقق من أخطاء ESLint أثناء الـ Build
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;