/* ============ فرمت‌بندی نمایشی فارسی ============ */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** تبدیل اعداد به ارقام فارسی برای نمایش */
export function faNum(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** فرمت دقیقه → متن فارسی */
export function minutesToText(min: number): string {
  if (!min || min <= 0) return '۰ دقیقه';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${faNum(h)} ساعت و ${faNum(m)} دقیقه`;
  if (h) return `${faNum(h)} ساعت`;
  return `${faNum(m)} دقیقه`;
}

/** فرمت میلی‌ثانیه → متن (برای تایمر) */
export function msToClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${faNum(p(h))}:${faNum(p(m))}:${faNum(p(s))}` : `${faNum(p(m))}:${faNum(p(s))}`;
}

/** درصد → رشته با عدد فارسی */
export function faPct(n: number): string {
  return `${faNum(Math.round(n))}٪`;
}
