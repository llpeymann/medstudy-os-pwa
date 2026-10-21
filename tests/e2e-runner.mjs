import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = process.cwd();
let server;
let browser;

try {
  server = await createServer({
    root,
    logLevel: 'warn',
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
  });
  await server.listen();

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
  const resultPath = new URL('./e2e-results.json', import.meta.url);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`E2E: ${result.passed}/${result.total} passed; ${result.failed} failed`);
  for (const item of result.results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.id}. ${item.name} — ${item.detail}`);
  }
  if (result.debug?.fatal) console.error(`FATAL ${result.debug.fatal}`);
  if (result.consoleErrors?.length) console.error(result.consoleErrors.join('\n'));

  if (result.failed > 0 || result.total !== 21 || result.debug?.fatal || result.consoleErrors?.length) {
    process.exitCode = 1;
  }
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
}
