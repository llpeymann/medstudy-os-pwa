async (page) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // تولید آیکون‌های PNG از SVG برای PWA
  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.goto('http://localhost:5173/icon.svg', { waitUntil: 'networkidle' });
    await sleep(200);
    await page.screenshot({ path: `/home/user/medstudy-os/public/icon-${size}.png`, omitBackground: true });
  }
  return 'icons generated';
}