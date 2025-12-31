import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Base path for assets - portal is served from /portal/ in Tauri
  base: './',

  // Path aliases - point to main app's src for component reuse
  resolve: {
    alias: {
      // Main app imports
      '@': path.resolve(__dirname, '../../../src'),
      '@portal': path.resolve(__dirname, './src'),

      // Next.js shims - allow reusing components that import from next/*
      'next/image': path.resolve(__dirname, './src/shims/next-image.tsx'),
      'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/shims/next-navigation.tsx'),
    },
  },

  // Build output goes to public/portal for Tauri to load
  build: {
    outDir: '../../../public/portal',
    emptyOutDir: true,
  },

  // Dev server config
  server: {
    port: 5174,
    strictPort: true,
  },

  // Optimize deps from main app
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'dexie',
      'framer-motion',
      'lucide-react',
    ],
  },
});
