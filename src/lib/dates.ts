/* ============ ابزارهای تاریخ — همه‌جا از منطقه زمانی محلی استفاده می‌کند ============ */
import { toJalaali, toGregorian, isValidJalaaliDate, jalaaliMonthLength, type JalaaliDate } from './jalaali';
import type { CalendarMode } from '../types';
import { faNum } from './format';

export const JALALI_MONTHS = [
  'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
  'مهر','آبان','آذر','دی','بهمن','اسفند',
];
export const GREGORIAN_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
export const WEEKDAYS_FA = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];

/** امروز به‌صورت yyyy-mm-dd بر اساس منطقه زمانی محلی کاربر */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidISODate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = fromISODate(s);
  return !isNaN(d.getTime());
}

export function addDaysISO(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** تفاوت روزها: b - a */
export function diffDays(aISO: string, bISO: string): number {
  const a = fromISODate(aISO);
  const b = fromISODate(bISO);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** تاریخ میلادی → رشته yyyy-mm-dd */
export function dateToISO(d: Date): string {
  return toISODate(d);
}

export interface FormattedDate {
  text: string;        // متن کامل فارسی
  short: string;       // کوتاه
  weekday?: string;
}

/** فرمت‌دهی بر اساس تقویم انتخابی (با ارقام فارسی) */
export function formatDate(iso: string | null | undefined, calendar: CalendarMode = 'jalali', withWeekday = false): string {
  if (!isValidISODate(iso)) return '—';
  const d = fromISODate(iso!);
  if (calendar === 'jalali') {
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const base = `${faNum(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${faNum(j.jy)}`;
    const wd = WEEKDAYS_FA[d.getDay()];
    return withWeekday ? `${wd} ${base}` : base;
  }
  const base = `${faNum(d.getDate())} ${GREGORIAN_MONTHS[d.getMonth()]} ${faNum(d.getFullYear())}`;
  const wd = WEEKDAYS_FA[d.getDay()];
  return withWeekday ? `${wd} ${base}` : base;
}

export function formatShort(iso: string, calendar: CalendarMode): string {
  if (!isValidISODate(iso)) return '—';
  const d = fromISODate(iso);
  if (calendar === 'jalali') {
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${j.jd}/${String(j.jm).padStart(2, '0')}/${String(j.jy).slice(2)}`;
  }
  return `${iso}`;
}

/** شمارش معکوس تا تاریخ آزمون (روز). منفی = گذشته */
export function daysUntil(targetISO: string | null | undefined, fromISO?: string): number | null {
  if (!isValidISODate(targetISO)) return null;
  return diffDays(fromISO ?? todayISO(), targetISO!);
}

/** تاریخ شمسی از رشته میلادی */
export function toJalaaliParts(iso: string): JalaaliDate | null {
  if (!isValidISODate(iso)) return null;
  const d = fromISODate(iso);
  return toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** ساخت ISO میلادی از تاریخ شمسی (با اعتبارسنجی) */
export function fromJalaaliToISO(jy: number, jm: number, jd: number): string | null {
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  const g = toGregorian(jy, jm, jd);
  return toISODate(new Date(g.gy, g.gm - 1, g.gd));
}

/** لیست روزهای یک ماه شمسی یا میلادی (برای تقویم) */
export function monthDays(
  year: number,
  month: number, // 1-based
  calendar: CalendarMode,
): { iso: string; day: number; jalaali: JalaaliDate }[] {
  const days: { iso: string; day: number; jalaali: JalaaliDate }[] = [];
  const total = calendar === 'jalali'
    ? jalaaliMonthLength(year, month)
    : new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    if (calendar === 'jalali') {
      const iso = fromJalaaliToISO(year, month, d);
      if (iso) days.push({ iso, day: d, jalaali: { jy: year, jm: month, jd: d } });
    } else {
      const iso = toISODate(new Date(year, month - 1, d));
      days.push({ iso, day: d, jalaali: toJalaali(year, month, d) });
    }
  }
  return days;
}

export function monthLabel(year: number, month: number, calendar: CalendarMode): string {
  if (calendar === 'jalali') return `${JALALI_MONTHS[month - 1]} ${year}`;
  return `${GREGORIAN_MONTHS[month - 1]} ${year}`;
}

/** تبدیل یک ISO میلادی به ابتدای ماه شمسی/میلادی خودش برای نمایش تقویم */
export function currentMonthStart(calendar: CalendarMode): { year: number; month: number } {
  const now = new Date();
  if (calendar === 'jalali') {
    const j = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { year: j.jy, month: j.jm };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** فهرست ۷ روز هفته شروع‌شده از شنبه (برای نمای هفتگی) */
export function weekDaysISO(fromISO: string): string[] {
  // شنبه شروع هفته — getDay(): ۰=یکشنبه … ۶=شنبه
  const d = fromISODate(fromISO);
  const distFromSaturday = (d.getDay() + 1) % 7;
  const start = addDaysISO(fromISO, -distFromSaturday);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
}

/** آیا روز تعطیل (جمعه) است */
export function isFriday(iso: string): boolean {
  return fromISODate(iso).getDay() === 5;
}

/** شمارش روزهای مطالعه بین دو تاریخ (با رعایت روزهای استراحت) */
export function studyDaysBetween(fromISO: string, toISO: string, daysPerWeek: number, restDays: string[]): number {
  let count = 0;
  let cur = fromISO;
  while (cur <= toISO) {
    const dow = fromISODate(cur).getDay();
    const isRest = restDays.includes(cur);
    // پیش‌فرض: مطالعه همه روزها مگر جمعه‌های تعییل‌شده و روزهای استراحت
    if (!isRest && !(daysPerWeek < 7 && dow === 5)) count++;
    cur = addDaysISO(cur, 1);
  }
  return count;
}
