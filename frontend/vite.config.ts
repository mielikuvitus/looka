import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend dev port (see backend .env / PORT). Same-origin: Vite proxies /api
// to the backend in dev, so there is no CORS. In prod the backend serves this
// build and /api from one origin.
const API_TARGET = 'http://localhost:8787'

const root = fileURLToPath(new URL('.', import.meta.url))

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
  build: {
    rollupOptions: {
      // Multi-page app: the room (index.html) plus Weathery's own window
      // (weathery.html), opened via window.open as a separate Spatial Scene.
      input: {
        main: `${root}index.html`,
        weathery: `${root}weathery.html`,
      },
    },
  },
})
