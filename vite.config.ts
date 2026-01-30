import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssr: {
    noExternal: ['@platejs/math', 'react-tweet'],
  },
  plugins: [
    devtools(),
    nitro({
      routeRules: {
        '/**': {
          headers: {
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Content-Security-Policy': [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' platform.twitter.com www.instagram.com www.tiktok.com assets.pinterest.com",
              "frame-src 'self' www.tiktok.com www.instagram.com assets.pinterest.com www.facebook.com platform.twitter.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' *.convex.cloud *.tiktok.com wss://*.convex.cloud",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        },
      },
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),

    tanstackStart(),
    viteReact(),
  ],
})

export default config
