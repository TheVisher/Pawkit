/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "@dnd-kit/core",
      "@dnd-kit/modifiers",
      "@dnd-kit/sortable",
      "zustand",
      "lucide-react",
      "date-fns"
    ],
    // Enable faster refresh in development
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Disable source maps in development for faster builds
    productionBrowserSourceMaps: false,
    
    // Optimize development server - more aggressive memory management
    onDemandEntries: {
      // Period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 10 * 1000, // Reduced from 25s to 10s
      // Number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 1, // Reduced from 2 to 1
    },
    
    // Additional development optimizations
    swcMinify: true,
    compiler: {
      // Remove console logs in development for better performance
      removeConsole: process.env.NODE_ENV === 'development' ? {
        exclude: ['error', 'warn']
      } : false,
    },
  }),

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://s.wordpress.com https://www.google.com https://img.youtube.com https://www.reddit.com https://www.tiktok.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
