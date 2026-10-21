async (page) => {
  const errors = [];
  const results = [];
  const out = { debug: {} };
  const check = (id, name, ok, detail = '') => results.push({ id, name, ok: !!ok, detail });
  const projectRoot = process.cwd();
  const appUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173/';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = (t) => page.locator('button', { hasText: t }).first();
  const click = async (t) => { await btn(t).click({ force: true }); };
  const toastText = async () => {
    const el = page.locator('.toast').last();
    return await el.isVisible().then(() => el.textContent()).catch(() => '');
  };

  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('Download the React DevTools')) errors.push('console: ' + t);
  });

  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await sleep(700);
  try {

  /* --- پاک‌سازی برای اجرای تکراری --- */
  await click('تنظیمات و پشتیبان‌گیری');
  await sleep(300);
  await click('پاک‌سازی همه داده‌ها');
  await sleep(300);
  await click('مرحله بعد');
  await sleep(300);
  await page.locator('input[placeholder="حذف"]').fill('حذف');
  await click('پاک‌سازی نهایی');
  await sleep(700);
  await page.goto(`${appUrl}#/subjects`);
  await sleep(500);

  /* --- سناریو ۲۰: فارسی و RTL --- */
  const dir = await page.evaluate(() => document.documentElement.dir);
  const lang = await page.evaluate(() => document.documentElement.lang);
  check(20, 'نمایش فارسی و RTL', dir === 'rtl' && lang === 'fa', `dir=${dir} lang=${lang}`);

  /* --- سناریو ۱: ساخت درس --- */
  await click('درس جدید');
  await sleep(300);
  await page.getByPlaceholder('مثلاً: آناتومی ۱').fill('آناتومی ۱');
  await click('افزودن درس');
  await sleep(400);
  check(1, 'ساخت درس', (await toastText()).includes('اضافه شد'), await toastText());

  /* --- سناریو ۲: ساخت فصل و مبحث --- */
  await click('فصل جدید');
  await sleep(250);
  await page.getByPlaceholder('مثلاً: فصل ۲ — سیستم عصبی').fill('فصل ۱ — استخوان‌بندی');
  await click('افزودن فصل');
  await sleep(300);
  await page.locator('[role="button"]', { hasText: 'فصل ۱ — استخوان‌بندی' }).click();
  await sleep(250);
  await click('افزودن مبحث به این فصل');
  await sleep(250);
  await page.getByPlaceholder('مثلاً: استخوان‌های جمجمه').fill('استخوان‌هنده جمجمه');
  await click('ایجاد مبحث');
  await sleep(400);
  check(2, 'ساخت فصل و مبحث', await btn('استخوان‌هنده جمجمه').isVisible(), 'مبحث در فصل نمایش داده شد');

  /* --- سناریو ۳: علامت مطالعه --- */
  await click('استخوان‌هنده جمجمه');
  await sleep(300);
  await click('مطالعه اولیه تمام شده');
  await sleep(250);
  await page.getByRole('spinbutton', { name: 'صفحات مطالعه‌شده' }).fill('12');
  await click('ثبت اتمام مطالعه');
  await sleep(500);
  const topicRowText = await page.locator('main').first().textContent();
  check(3, 'علامت‌زدن مطالعه', topicRowText.includes('مطالعه اولیه تمام شده'), 'وضعیت در ردیف مبحث نمایش داده شد');

  /* --- سناریو ۴: تغییر تسلط --- */
  await click('استخوان‌هنده جمجمه');
  await sleep(300);
  await page.locator('input[type="range"]').first().fill('75');
  await click('ذخیره اطلاعات');
  await sleep(400);
  await click('استخوان‌هنده جمجمه');
  await sleep(300);
  const mastery = await page.locator('input[type="range"]').first().inputValue();
  check(4, 'تغییر وضعیت تسلط', mastery === '75', `slider=${mastery}`);
  await page.keyboard.press('Escape');
  await sleep(200);

  /* --- سناریو ۵ و ۶: ثبت مرور و نمایش موعدرسیده --- */
  await click('مرورهای هوشمند');
  await sleep(400);
  const nearCount = await page.locator('button', { hasText: /نزدیک به موعد/ }).first().textContent();
  check(6, 'نمایش مرور موعدرسیده', /۱/.test(nearCount ?? ''), `نزدیک به موعد: ${nearCount}`);
  await page.locator('button', { hasText: /نزدیک به موعد/ }).first().click();
  await sleep(300);
  await click('ثبت نتیجه');
  await sleep(300);
  await click('خوب');
  await sleep(200);
  await click('ثبت مرور');
  await sleep(500);
  const doneTab = await page.locator('button', { hasText: /انجام‌شده امروز/ }).first().textContent();
  check(5, 'ثبت مرور', /۱/.test(doneTab ?? ''), `انجام‌شده امروز: ${doneTab}`);

  /* --- سناریو ۷ و ۸: ثبت تست و محاسبه درصد --- */
  out.debug.modsAfterReview = await page.locator('.modal-sheet').count();
  await click('تست‌ها و آمار');
  await sleep(300);
  out.debug.modsOnTests = await page.locator('.modal-sheet').count();
  out.debug.modalHeads = await page.locator('.modal-sheet h3').allTextContents();
  await click('ثبت تست');
  await sleep(300);
  await page.locator('.modal-sheet select').first().selectOption({ label: 'آناتومی ۱' });
  await sleep(200);
  const numInputs = page.locator('.modal-sheet input[type="number"]');
  await numInputs.nth(0).fill('20');
  await numInputs.nth(1).fill('14');
  await numInputs.nth(2).fill('4');
  await page.locator('.modal-sheet button', { hasText: 'ثبت تست' }).click({ force: true });
  await sleep(500);
  const pctPill = await page.locator('.pill', { hasText: '۷۰٪' }).first().isVisible();
  check(7, 'ثبت تست', pctPill, 'تست ثبت شد');
  check(8, 'محاسبه درصد تست', pctPill, '۱۴/۲۰ = ۷۰٪');

  /* --- سناریو ۹: ثبت اشتباه --- */
  await click('دفترچه اشتباهات');
  await sleep(300);
  await click('ثبت اشتباه');
  await sleep(300);
  await page.locator('.modal-sheet select').first().selectOption({ label: 'آناتومی ۱' });
  await sleep(200);
  await page.getByPlaceholder('سؤال یا وضعیت خطا…').fill('تفاوت فک بالا و پایین؟');
  await page.getByPlaceholder('پاسخ درست و توضیح کوتاه').fill('فک بالا دارای دندانخان');
  await page.locator('.modal-sheet button', { hasText: 'ثبت اشتباه' }).click({ force: true });
  await sleep(500);
  check(9, 'ثبت اشتباه', await page.getByText('تفاوت فک بالا').first().isVisible(), 'اشتباه ثبت شد');

  /* --- سناریو ۱۰: ساخت وظیفه روزانه --- */
  await click('برنامه امروز');
  await sleep(300);
  await click('وظیفه');
  await sleep(300);
  await page.getByPlaceholder('مثلاً: مطالعه فصل ۳ کنکور').fill('مطالعه فصل استخوان‌بندی');
  await page.locator('.modal-sheet button', { hasText: 'افزودن' }).click({ force: true });
  await sleep(400);
  check(10, 'ساخت وظیفه روزانه', await page.getByText('مطالعه فصل استخوان‌بندی').first().isVisible(), 'وظیفه ثبت شد');

  /* --- سناریو ۱۱: جابه‌جایی وظیفه --- */
  await page.locator('button[title="انتقال به روز دیگر"]').first().click();
  await sleep(300);
  const future = await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  await page.locator('input[type="date"]').first().fill(future);
  await page.locator('.modal-sheet button', { hasText: 'انتقال' }).click({ force: true });
  await sleep(400);
  const mvToast = await toastText();
  check(11, 'جابه‌جایی وظیفه', mvToast.includes('منتقل شد'), mvToast);

  /* --- سناریو ۱۲ و ۱۳: تم (چرخه: سیستم→روشن→تیره) --- */
  const themeBtn = page.locator('button[title*="تم فعلی"]');
  await themeBtn.click(); // سیستم → روشن
  await sleep(300);
  const after1 = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await themeBtn.click(); // روشن → تیره
  await sleep(800); // صبر برای ذخیره debounce
  const darkOn = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(900);
  const darkAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await themeBtn.click(); // تیره → سیستم
  await sleep(300);
  check(12, 'تغییر تم', !after1 && darkOn, `روشن:${!after1} تیره:${darkOn}`);
  check(13, 'حفظ تم پس از رفرش', darkAfterReload, `پس از reload تم تیره=${darkAfterReload}`);

  /* --- سناریو ۱۴: حفظ اطلاعات --- */
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(600);
  await click('دروس و مباحث');
  await sleep(500);
  await page.locator('[role="button"]', { hasText: 'فصل ۱' }).click();
  await sleep(400);
  const persistVisible = await btn('استخوان‌هنده جمجمه').isVisible();
  check(14, 'حفظ اطلاعات پس از بستن و بازکردن', persistVisible, 'مبحث پس از reload باقی است');

  /* --- سناریو ۱۸: تاریخ آزمون --- */
  await click('تنظیمات و پشتیبان‌گیری');
  await sleep(300);
  await page.locator('select').nth(0).selectOption({ label: '۱۴۰۶' });
  await page.locator('select').nth(1).selectOption({ label: '۶' });
  await page.locator('select').nth(2).selectOption({ label: '۱۵' });
  await click('ذخیره تاریخ آزمون');
  await sleep(400);
  await click('داشبورد');
  await sleep(400);
  const headerText = await page.locator('header').first().textContent();
  check(18, 'تاریخ آزمون و شمارش معکوس', /روز مانده/.test(headerText), headerText.includes('روز مانده') ? 'شمارش معکوس فعال' : headerText.slice(0, 60));

  /* --- سناریو ۱۵: تهیه نسخه پشتیبان --- */
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.locator('button[title="تهیه نسخه پشتیبان JSON"]').click(),
  ]);
  const backupPath = `${projectRoot}/tests/e2e-backup.json`;
  await download.saveAs(backupPath);
  const dlStream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of dlStream) chunks.push(chunk);
  const backupContent = Buffer.concat(chunks).toString('utf-8');
  check(15, 'تهیه نسخه پشتیبان', backupContent.includes('medstudy-os') && backupContent.includes('استخوان‌هنده'), `${backupContent.length} بایت`);

  /* --- سناریو ۱۷: فایل نامعتبر --- */
  const fileInput = page.locator('input[type="file"]');
  await click('تنظیمات و پشتیبان‌گیری');
  await sleep(300);
  await fileInput.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ hello: 'world' })),
  });
  await sleep(700);
  const errToast = await toastText();
  check(17, 'مدیریت فایل نامعتبر', /نامعتبر|متعلق|آسیب/.test(errToast), errToast);

  /* --- سناریو ۱۶: بازیابی --- */
  await fileInput.setInputFiles(backupPath);
  await sleep(700);
  const summaryOk = await page.getByText('خلاصه نسخه پشتیبان').first().isVisible();
  await click('جایگزینی و بازیابی');
  await sleep(700);
  const importToast = await toastText();
  check(16, 'بازیابی نسخه پشتیبان', summaryOk && importToast.includes('بازیابی'), `summary=${summaryOk}`);

  /* --- سناریو ۱۹: موبایل --- */
  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(600);
  const mobileNav = await page.locator('.mobile-nav').first().isVisible();
  await page.screenshot({ path: `${projectRoot}/tests/screenshot-mobile.png` });
  check(19, 'نمایش در اندازه موبایل', mobileNav, 'ناوبری پایین نمایش داده شد');
  await page.setViewportSize({ width: 1280, height: 800 });

  /* --- اسکرین‌شات‌های تحویل --- */
  await page.goto(`${appUrl}#/dashboard`, { waitUntil: 'networkidle' });
  await sleep(700);
  await page.screenshot({ path: `${projectRoot}/tests/screenshot-dashboard-light.png`, fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await sleep(300);
  await page.screenshot({ path: `${projectRoot}/tests/screenshot-dashboard-dark.png`, fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  check(21, 'بررسی خطاهای Console', errors.length === 0, errors.length ? errors.slice(0, 5).join(' | ').slice(0, 400) : 'بدون خطای console');
  } catch (e) {
    out.debug.fatal = String(e.message).split('\n')[0];
    out.debug.fatalStack = String(e.stack || '').split('\n').slice(1, 4).join(' | ');
    await page.screenshot({ path: `${projectRoot}/tests/screenshot-error.png` }).catch(() => {});
  }

  return JSON.stringify({
    debug: out.debug,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    consoleErrors: errors,
  }, null, 1);
}