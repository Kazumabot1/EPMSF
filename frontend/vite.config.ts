import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8081';

export default defineConfig({
  plugins: [react()],
  // sockjs-client references Node's `global`; browsers only have `globalThis` / `window`.
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});