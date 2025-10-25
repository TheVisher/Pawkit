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
  },

  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
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
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      // Remove console logs in production (except errors and warnings)
      removeConsole: {
        exclude: ['error', 'warn']
      },
    },
  }),

  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Script sources - stricter in production
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://vercel.live"
                : "script-src 'self' 'unsafe-inline' blob:",
              isDev
                ? "script-src-elem 'self' 'unsafe-inline' blob: https://vercel.live"
                : "script-src-elem 'self' 'unsafe-inline' blob:",
              // Styles
              "style-src 'self' 'unsafe-inline' blob:",
              "style-src-elem 'self' 'unsafe-inline'",
              // Images - support all user content (http: only in dev)
              isDev
                ? "img-src 'self' data: https: http: blob:"
                : "img-src 'self' data: https: blob:",
              // Fonts
              "font-src 'self' data: blob:",
              // API connections - stricter in production
              isDev
                ? "connect-src 'self' https: http: blob: data: wss: ws: https://vercel.live wss://ws-us3.pusher.com"
                : "connect-src 'self' https: blob: data: wss: ws: wss://ws-us3.pusher.com",
              // Frames for embeds
              isDev
                ? "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://vercel.live"
                : "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              // Workers
              "worker-src 'self' blob:",
              // Objects
              "object-src 'none'",
              // Media - stricter in production
              isDev
                ? "media-src 'self' https: http: blob: data:"
                : "media-src 'self' https: blob: data:",
              // Manifest
              "manifest-src 'self'",
              // Frame ancestors
              "frame-ancestors 'none'",
              // Base URI
              "base-uri 'self'",
              // Form actions
              "form-action 'self'",
              // Report CSP violations (only in production)
              ...(!isDev ? ["report-uri /api/csp-report"] : [])
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
