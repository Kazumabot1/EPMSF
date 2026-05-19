import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Must match EPMS `server.port` (default 8081 in application.properties). */
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8081';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  define: {
    global: 'globalThis',
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn(
              `[vite] API proxy could not reach ${apiProxyTarget}. Start the EPMS backend (port 8081) and MySQL, then retry.`,
              err.message,
            );
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  message:
                    'Cannot reach the API server. Start the EPMS backend on http://localhost:8081 (MySQL must be running), then try again.',
                  status: 502,
                  error: 'Bad Gateway',
                }),
              );
            }
          });
        },
      },
      '/ws': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});