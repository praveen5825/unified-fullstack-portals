import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
   plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/p3/',
  server: {
    port: 5174,
    host: '0.0.0.0', // Listen on all network interfaces
    strictPort: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'desktop-4ji2vq2.tailafdbde.ts.net'
    ],
    hmr: {
      path: '/p3/@vite/client',
    },
   proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    secure: false,
  },
  '/media': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    secure: false,
  },
}
  }
})
