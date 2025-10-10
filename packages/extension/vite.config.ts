import { defineConfig, UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

const isServiceWorker = process.env.BUILD_TARGET === 'service-worker'
const isContentScript = process.env.BUILD_TARGET === 'content-script'

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
            src: 'icons/*',
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
      emptyOutDir: !isServiceWorker && !isContentScript, // Don't clear on second/third build
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
        : isContentScript
        ? {
            // Content script build - IIFE format with inlined deps
            input: {
              'content-script': path.resolve(__dirname, 'src/content/content-script.ts')
            },
            output: {
              entryFileNames: 'content-script.js',
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
