import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend dev port (see backend .env / PORT). Same-origin: Vite proxies /api
// to the backend in dev, so there is no CORS. In prod the backend serves this
// build and /api from one origin.
const API_TARGET = 'http://localhost:8787'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
