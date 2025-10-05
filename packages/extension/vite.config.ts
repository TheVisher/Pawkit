import { defineConfig, UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

const isServiceWorker = process.env.BUILD_TARGET === 'service-worker'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const config: UserConfig = {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'manifest.json',
            dest: '.'
          },
          {
            src: 'src/assets/icons/*',
            dest: 'icons'
          }
        ]
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: !isServiceWorker, // Don't clear on second build
      rollupOptions: isServiceWorker
        ? {
            // Service worker build - IIFE format with inlined deps
            input: {
              'service-worker': path.resolve(__dirname, 'src/service-worker.ts')
            },
            output: {
              entryFileNames: 'service-worker.js',
              format: 'iife'
            }
          }
        : {
            // UI build - ES modules
            input: {
              popup: path.resolve(__dirname, 'src/popup/index.html'),
              options: path.resolve(__dirname, 'src/options/index.html')
            },
            output: {
              entryFileNames: 'assets/[name]-[hash].js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash].[ext]'
            }
          }
    }
  }

  return config
})
