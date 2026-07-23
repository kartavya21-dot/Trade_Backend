import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/employees': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/visitor': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/conversations': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/chat': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true
      }
    }
  }
})
