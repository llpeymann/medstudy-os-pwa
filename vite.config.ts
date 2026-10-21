import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // مسیر نسبی، دارایی‌ها را هم در وب و هم در پروتکل داخلی Tauri قابل بارگذاری می‌کند.
  base: process.env.GITHUB_PAGES === 'true' ? '/medstudy-os-pwa/' : './',
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  server: {
    // CLI نسخه وب روی 0.0.0.0 و Tauri فقط روی loopback override می‌کند.
    host: false,
    port: 5173,
    strictPort: true,
    allowedHosts: true, // پذیرش هاست‌های پیش‌نمایش Arena
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    // WebView2 موجود در Windows 11 بر پایه Chromium است.
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'es2020',
    minify: process.env.TAURI_ENV_DEBUG === 'true' ? false : 'esbuild',
    // نقشه منبع برای وب باقی می‌ماند، اما داخل بسته انتشار دسکتاپ قرار نمی‌گیرد.
    sourcemap: process.env.TAURI_ENV_PLATFORM
      ? process.env.TAURI_ENV_DEBUG === 'true'
      : true,
  },
});
