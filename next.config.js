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
              // Script sources - needed for Next.js and dynamic imports
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "script-src-elem 'self' 'unsafe-inline' blob:",
              // Styles
              "style-src 'self' 'unsafe-inline' blob:",
              "style-src-elem 'self' 'unsafe-inline'",
              // Images - support all user content
              "img-src 'self' data: https: http: blob:",
              // Fonts
              "font-src 'self' data: blob:",
              // API connections - more permissive for user content
              "connect-src 'self' https: http: blob: data: wss: ws:",
              // Frames for embeds
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              // Workers
              "worker-src 'self' blob:",
              // Objects
              "object-src 'none'",
              // Media
              "media-src 'self' https: http: blob: data:",
              // Manifest
              "manifest-src 'self'",
              // Frame ancestors
              "frame-ancestors 'none'",
              // Base URI
              "base-uri 'self'",
              // Form actions
              "form-action 'self'",
              // Report CSP violations (only in production)
              ...(process.env.NODE_ENV === 'production' ? ["report-uri /api/csp-report"] : [])
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
