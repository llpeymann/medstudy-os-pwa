import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const DIST = resolve(ROOT, 'dist');
const BASE = '/medstudy-os-pwa/';
const failures = [];

function check(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL  ${message}`);
  }
}

function filesUnder(dir) {
  const result = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = resolve(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else result.push(relative(dir, full).replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return result;
}

function pngSize(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

check(existsSync(resolve(DIST, 'index.html')), 'dist/index.html موجود است');
if (!existsSync(DIST)) process.exit(1);

const files = filesUnder(DIST);
const index = readFileSync(resolve(DIST, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(DIST, 'manifest.webmanifest'), 'utf8'));
const sw = readFileSync(resolve(DIST, 'sw.js'), 'utf8');
const mainSource = readFileSync(resolve(ROOT, 'src/main.tsx'), 'utf8');

check(index.includes('<html lang="fa" dir="rtl">'), 'زبان فارسی و RTL در HTML خروجی');
check(index.includes(`href="${BASE}manifest.webmanifest"`), 'manifest از زیرمسیر مخزن بارگذاری می‌شود');
check(index.includes(`href="${BASE}icon.svg"`), 'favicon از زیرمسیر مخزن بارگذاری می‌شود');
check(index.includes(`src="${BASE}assets/`), 'JavaScript از زیرمسیر مخزن بارگذاری می‌شود');
check(index.includes(`href="${BASE}assets/`), 'CSS از زیرمسیر مخزن بارگذاری می‌شود');
check(!/(?:src|href)="\/(?!medstudy-os-pwa\/)/.test(index), 'هیچ assetای اشتباهاً از ریشه دامنه درخواست نمی‌شود');

const publicUrls = [...index.matchAll(/(?:src|href)="(\/medstudy-os-pwa\/[^"?#]+)"/g)].map((match) => match[1]);
for (const url of publicUrls) {
  const path = url.slice(BASE.length);
  check(existsSync(resolve(DIST, path)), `فایل ارجاع‌شده موجود است: ${path}`);
}

check(manifest.start_url === './', 'manifest.start_url با زیرمسیر سازگار است');
check(manifest.scope === './', 'manifest.scope با زیرمسیر سازگار است');
check(manifest.display === 'standalone', 'حالت نمایش standalone است');
check(manifest.dir === 'rtl' && manifest.lang === 'fa', 'manifest فارسی و RTL است');
check(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'آیکون‌های manifest تعریف شده‌اند');

for (const icon of manifest.icons) {
  const path = String(icon.src).replace(/^\.\//, '');
  check(existsSync(resolve(DIST, path)), `آیکون manifest موجود است: ${path}`);
}
check(JSON.stringify(manifest.icons).includes('192x192'), 'آیکون ۱۹۲×۱۹۲ تعریف شده است');
check(JSON.stringify(manifest.icons).includes('512x512'), 'آیکون ۵۱۲×۵۱۲ تعریف شده است');
check(JSON.stringify(manifest.icons).includes('maskable'), 'آیکون maskable تعریف شده است');
check(JSON.stringify(pngSize(resolve(DIST, 'icon-192.png'))) === '[192,192]', 'ابعاد واقعی icon-192 صحیح است');
check(JSON.stringify(pngSize(resolve(DIST, 'icon-512.png'))) === '[512,512]', 'ابعاد واقعی icon-512 صحیح است');

check(sw.includes("new URL('./', self.registration.scope)"), 'Service Worker محدوده نصب را مبنای URLها قرار می‌دهد');
check(sw.includes("url.origin !== self.location.origin"), 'Service Worker فقط درخواست‌های same-origin را مدیریت می‌کند');
check(sw.includes("url.href.startsWith(BASE_URL.href)"), 'Service Worker فقط زیرمسیر برنامه را cache می‌کند');
check(mainSource.includes('import.meta.env.BASE_URL}sw.js'), 'ثبت Service Worker از BASE_URL استفاده می‌کند');

const forbidden = files.filter((file) =>
  file.endsWith('.map') ||
  /(^|\/)(tests?|src-tauri|node_modules)(\/|$)/i.test(file) ||
  /(?:sample-backup|e2e-results|\.env)/i.test(file),
);
check(forbidden.length === 0, `خروجی فاقد source map، تست، داده نمونه و فایل محرمانه است${forbidden.length ? `: ${forbidden.join(', ')}` : ''}`);

const assetExtensions = new Set(files.map((file) => extname(file)));
check(assetExtensions.has('.js') && assetExtensions.has('.css') && assetExtensions.has('.woff2'), 'JavaScript، CSS و فونت داخل artifact هستند');
console.log(`INFO  ${files.length} فایل در artifact بررسی شد.`);

if (failures.length) {
  console.error(`\n${failures.length} بررسی PWA ناموفق بود.`);
  process.exit(1);
}
console.log('\nهمه بررسی‌های artifact مخصوص GitHub Pages موفق بودند.');
