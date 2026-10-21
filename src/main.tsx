import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// نسخه دسکتاپ همه دارایی‌ها را داخل بسته Tauri دارد و نباید Service Worker وب
// را ثبت کند؛ این کار از کش‌شدن نسخه‌های قدیمی پس از ارتقای برنامه جلوگیری می‌کند.
const isTauriRuntime =
  '__TAURI_INTERNALS__' in window ||
  window.location.hostname === 'tauri.localhost' ||
  window.location.protocol === 'tauri:';

// ثبت Service Worker فقط برای نسخه وب/PWA (آفلاین)
if ('serviceWorker' in navigator && import.meta.env.PROD && !isTauriRuntime) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* آفلاین‌بودن PWA اختیاری است */
    });
  });
}
