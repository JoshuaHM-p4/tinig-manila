import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server proxies API + WebSocket traffic to the Express backend on :3000
// so the React app can call fetch('/api/...') and io('/') with no CORS pain.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/twilio': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
