import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ساخت عادی قابل‌حمل است؛ build:pages این مقدار را با زیرمسیر مخزن override می‌کند.
  base: './',
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    host: false,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: false,
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    // سورس‌مپ برای انتشار عمومی لازم نیست و کد منبع را بی‌دلیل منتشر می‌کند.
    sourcemap: false,
  },
});
