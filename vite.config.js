import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serverar sajten under /marcs-halsoai/ (VITE_BASE sätts i
  // .github/workflows/pages.yml). Vercel och lokalt: '/'.
  base: process.env.VITE_BASE || '/',
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5245,
  },
});
