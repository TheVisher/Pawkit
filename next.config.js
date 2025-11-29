/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  // Exclude React Native mobile app from Next.js build
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/mobile/**'],
    };

    // Handle @filen/sdk browser build which incorrectly imports Node.js modules
    // Configuration based on Filen's official web app (uses vite-plugin-node-polyfills)
    // Only apply fallbacks for client-side builds
    if (!isServer) {
      // Force webpack to use browser builds for problematic packages
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure SDK uses its browser build
        '@filen/sdk': require.resolve('@filen/sdk/dist/browser/index.js'),
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        // Provide polyfills for modules required by Filen SDK
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
      };

      // Inject globals that Filen SDK expects (Buffer, process, global)
      // This replicates vite-plugin-node-polyfills globals config
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // Define global for browser compatibility
      config.plugins.push(
        new webpack.DefinePlugin({
          'global': 'globalThis',
        })
      );
    }

    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains for user-generated content
      },
      {
        protocol: 'http',
        hostname: '**', // Allow HTTP only in development
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
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
  // Note: SVGR webpack loader is not supported in Turbopack
  // SVGs can be imported as URLs directly in Turbopack
  turbopack: {},

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
  // Only remove console logs in TRUE production, not in preview deployments
  ...(process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview' && {
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
    // Vercel preview deployments need looser CSP for feedback tools
    const isPreview = process.env.VERCEL_ENV === 'preview';
    const allowVercelScripts = isDev || isPreview;

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Script sources - Next.js requires 'unsafe-eval' and 'unsafe-inline' even in production
              allowVercelScripts
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://vercel.live https://vercel.live"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              allowVercelScripts
                ? "script-src-elem 'self' 'unsafe-inline' blob: https://vercel.live https://*.vercel-scripts.com"
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
              // API connections - allow Vercel live on dev and preview
              allowVercelScripts
                ? "connect-src 'self' https: http: blob: data: wss: ws: https://vercel.live wss://ws-us3.pusher.com"
                : "connect-src 'self' https: blob: data: wss: wss://ws-us3.pusher.com",
              // Frames for embeds - allow Vercel live on dev and preview
              allowVercelScripts
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
              // Report CSP violations (only in true production)
              ...(!allowVercelScripts ? ["report-uri /api/csp-report"] : [])
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
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
