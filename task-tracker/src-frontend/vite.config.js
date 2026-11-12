import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The production app is served from /task-tracker/ under Apache (XAMPP),
// with the PHP API at /task-tracker/api/. During development, Vite proxies
// those API calls to Apache so sessions work on one origin.
export default defineConfig({
  base: '/task-tracker/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/task-tracker/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
});
