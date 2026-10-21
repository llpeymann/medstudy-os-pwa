import { createServer as createHttpServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const root = process.cwd();
const pagesMode = process.argv.includes('--pages');
const pagesBase = '/medstudy-os-pwa/';
const baseUrl = pagesMode
  ? `http://127.0.0.1:4173${pagesBase}`
  : 'http://127.0.0.1:5173/';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function startPagesServer() {
  const dist = resolve(root, 'dist');
  const server = createHttpServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (!pathname.startsWith(pagesBase)) {
        response.writeHead(404).end('Not found');
        return;
      }
      const relativePath = pathname.slice(pagesBase.length) || 'index.html';
      const filePath = resolve(dist, relativePath);
      if (!filePath.startsWith(`${dist}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(filePath);
      const headers = {
        'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
        'Cache-Control': relativePath === 'sw.js' ? 'no-cache' : 'public, max-age=0',
      };
      if (relativePath === 'sw.js') headers['Service-Worker-Allowed'] = pagesBase;
      response.writeHead(200, headers).end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(4173, '127.0.0.1', resolveListen);
  });
  return server;
}

let server;
let browser;

try {
  if (pagesMode) {
    server = await startPagesServer();
  } else {
    server = await createViteServer({
      root,
      logLevel: 'warn',
      server: { host: '127.0.0.1', port: 5173, strictPort: true },
    });
    await server.listen();
  }

  process.env.E2E_BASE_URL = baseUrl;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'fa-IR',
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const source = await readFile(new URL('./e2e.mjs', import.meta.url), 'utf8');
  const scenario = Function(`"use strict"; return (${source});`)();
  const raw = await scenario(page);
  const result = JSON.parse(raw);

  if (pagesMode) {
    await page.goto(`${baseUrl}#/dashboard`, { waitUntil: 'networkidle' });
    const registration = await page.evaluate(async () => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service Worker آماده نشد')), 10000),
      );
      const ready = await Promise.race([navigator.serviceWorker.ready, timeout]);
      if (!navigator.serviceWorker.controller) {
        await Promise.race([
          new Promise((resolveControl) =>
            navigator.serviceWorker.addEventListener('controllerchange', resolveControl, { once: true }),
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Service Worker کنترل صفحه را نگرفت')), 10000),
          ),
        ]);
      }
      return {
        controlled: Boolean(navigator.serviceWorker.controller),
        scope: ready.scope,
        scriptURL: ready.active?.scriptURL ?? '',
      };
    });

    const cdp = await context.newCDPSession(page);
    const [manifestReport, installabilityReport] = await Promise.all([
      cdp.send('Page.getAppManifest'),
      cdp.send('Page.getInstallabilityErrors'),
    ]);

    await context.setOffline(true);
    let offlineRendered = false;
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      offlineRendered = await page.locator('body').innerText().then((text) => text.includes('داشبورد'));
    } finally {
      await context.setOffline(false);
    }

    result.pwa = {
      ...registration,
      offlineRendered,
      baseUrl,
      manifestUrl: manifestReport.url,
      manifestErrors: manifestReport.errors ?? [],
      installabilityErrors: installabilityReport.installabilityErrors ?? [],
    };
  }

  const resultPath = new URL('./e2e-results.json', import.meta.url);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`E2E: ${result.passed}/${result.total} passed; ${result.failed} failed`);
  for (const item of result.results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.id}. ${item.name} — ${item.detail}`);
  }
  if (result.pwa) {
    const pwaOk = result.pwa.controlled && result.pwa.offlineRendered &&
      result.pwa.scope.endsWith('/medstudy-os-pwa/') &&
      result.pwa.scriptURL.endsWith('/medstudy-os-pwa/sw.js') &&
      result.pwa.manifestUrl.endsWith('/medstudy-os-pwa/manifest.webmanifest') &&
      result.pwa.manifestErrors.length === 0 &&
      result.pwa.installabilityErrors.length === 0;
    console.log(`${pwaOk ? 'PASS' : 'FAIL'}  PWA Service Worker — ${JSON.stringify(result.pwa)}`);
    if (!pwaOk) process.exitCode = 1;
  }
  if (result.debug?.fatal) console.error(`FATAL ${result.debug.fatal}`);
  if (result.consoleErrors?.length) console.error(result.consoleErrors.join('\n'));

  if (result.failed > 0 || result.total !== 21 || result.debug?.fatal || result.consoleErrors?.length) {
    process.exitCode = 1;
  }
} finally {
  if (browser) await browser.close();
  if (server) {
    if (pagesMode) await new Promise((resolveClose) => server.close(resolveClose));
    else await server.close();
  }
}
