/* ============ موتور مرور فاصله‌دار — منطق خالص ============ */
import type { AppState, ReviewEntry, ReviewResult, Topic } from '../types';
import { addDaysISO, todayISO, diffDays } from './dates';

/**
 * پیش‌فرض پیشنهادی فاصله مرورها (روز):
 * ۱، ۳، ۷، ۱۴ و سپس بر اساس نتیجه و نیاز کاربر.
 * این فاصله‌ها در تنظیمات قابل تغییرند و صرفاً پیشنهادی هستند،
 * نه قانون علمی قطعی برای همه افراد.
 */
export const DEFAULT_INTERVALS = [1, 3, 7, 14, 30, 30, 60, 60];

/** ساخت برنامه مرور اولیه یک مبحث پس از اتمام مطالعه اولیه
 *  فاصله‌ها از تاریخ مطالعه به‌صورت مطلق محاسبه می‌شوند:
 *  مرور اول ۱ روز بعد، دوم ۳ روز بعد، سوم ۷ روز بعد، چهارم ۱۴ روز بعد. */
export function createInitialSchedule(topicId: string, studyDateISO: string, intervals: number[]): ReviewEntry[] {
  // مدل تدریجی: فقط مرور نخست ایجاد می‌شود؛ پس از ثبت نتیجه هر مرور،
  // مرور بعدی با فاصله بعدی برنامه‌ریزی می‌شود (مدل Anki).
  const date = addDaysISO(studyDateISO, intervals[0] ?? 1);
  return [{
    id: `rev-${topicId}-1-${studyDateISO}`,
    topicId,
    reviewNumber: 1,
    scheduledDate: date,
    doneDate: null,
    result: null,
    mastery: null,
    durationMinutes: null,
    needsReviewAgain: false,
    errorNotes: '',
    status: 'pending',
  }];
}

/** فاصله بعدی بر اساس نتیجه مرور */
export function nextIntervalDays(reviewNumber: number, result: ReviewResult, intervals: number[]): number {
  if (result === 'forgotten') return 1;   // فراموش شده → یک روز دیگر
  if (result === 'poor') return 1;        // ضعیف → یک روز دیگر
  const idx = Math.min(reviewNumber, intervals.length - 1);
  const base = intervals[idx];
  // مرورهای بعد از آخرین فاصله تعریف‌شده: ۱.۵ برابر قبلی
  if (reviewNumber >= intervals.length) {
    return Math.round(base * 1.5);
  }
  return base;
}

/** آیا نتیجه مرور نیاز به تکرار فوری دارد */
export function resultNeedsRepeat(result: ReviewResult): boolean {
  return result === 'poor' || result === 'forgotten';
}

/** شماره مرور بعدی */
export function nextReviewNumber(result: ReviewResult, current: number): number {
  return resultNeedsRepeat(result) ? Math.max(1, current - 1) : current + 1;
}

/** محاسبه موعد مرور بعدی (تاریخ) */
export function nextScheduledDate(fromDateISO: string, result: ReviewResult, nextNumber: number, intervals: number[]): string {
  const days = nextIntervalDays(nextNumber, result, intervals);
  return addDaysISO(fromDateISO, days);
}

/** وضعیت یک مرور نسبت به امروز */
export type ReviewBucket = 'dueToday' | 'overdue' | 'upcoming' | 'done';

export function reviewBucket(entry: ReviewEntry, today: string): ReviewBucket {
  if (entry.status === 'done') return 'done';
  const diff = diffDays(today, entry.scheduledDate);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'dueToday';
  return 'upcoming';
}

export interface ReviewBuckets {
  dueToday: ReviewEntry[];
  overdue: ReviewEntry[];
  upcoming: ReviewEntry[];
  doneToday: ReviewEntry[];
  allPending: ReviewEntry[];
}

/** دسته‌بندی مرورها برای صفحه مرورهای امروز */
export function reviewBuckets(state: AppState, today = todayISO()): ReviewBuckets {
  const pending = state.reviews.filter((r) => r.status === 'pending');
  const buckets: ReviewBuckets = {
    dueToday: [],
    overdue: [],
    upcoming: [],
    doneToday: state.reviews.filter(
      (r) => r.status === 'done' && r.doneDate === today,
    ),
    allPending: pending,
  };
  for (const r of pending) {
    const b = reviewBucket(r, today);
    if (b === 'dueToday') buckets.dueToday.push(r);
    else if (b === 'overdue') buckets.overdue.push(r);
    else buckets.upcoming.push(r);
  }
  const byDate = (a: ReviewEntry, b: ReviewEntry) => a.scheduledDate.localeCompare(b.scheduledDate);
  buckets.dueToday.sort(byDate);
  buckets.overdue.sort(byDate);
  buckets.upcoming.sort(byDate);
  return buckets;
}

/** موعد مرور بعدی یک مبحث (نزدیک‌ترین مرور معلق) */
export function topicNextReview(state: AppState, topicId: string): string | null {
  const next = state.reviews
    .filter((r) => r.topicId === topicId && r.status === 'pending')
    .map((r) => r.scheduledDate)
    .sort();
  return next.length ? next[0] : null;
}

/** آیا مروری عقب افتاده است؟ (بدون جابه‌جایی بی‌صدا) */
export function isOverdue(entry: ReviewEntry, today = todayISO()): boolean {
  return entry.status === 'pending' && diffDays(today, entry.scheduledDate) < 0;
}

/** گزارش مرورهای عقب‌افتاده */
export function overdueReviews(state: AppState, today = todayISO()): ReviewEntry[] {
  return state.reviews
    .filter((r) => isOverdue(r, today))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

/** تعداد مرورهای انجام‌شده یک مبحث */
export function topicReviewCount(state: AppState, topicId: string): number {
  return state.reviews.filter((r) => r.topicId === topicId && r.status === 'done').length;
}

/** پیشنهاد موعد مرور برای مبحث (بدون ثبت) — برای نمایش در فرم‌ها */
export function suggestReviewDate(topic: Topic, state: AppState, today = todayISO()): string | null {
  if (topic.studyStatus === 'not_started' || topic.studyStatus === 'in_progress') return null;
  const lastDone = state.reviews
    .filter((r) => r.topicId === topic.id && r.status === 'done')
    .map((r) => r.reviewNumber)
    .reduce((a, b) => Math.max(a, b), 0);
  const intervals = state.settings.reviewIntervals;
  const next = nextIntervalDays(lastDone + 1, 'ok', intervals);
  return addDaysISO(today, next);
}

/** جبران وظایف عقب‌افتاده: پیشنهاد توزیع روی روزهای مطالعاتی باقی‌مانده */
export interface CatchupPlan {
  date: string;
  count: number;
}

export function suggestCatchupPlan(
  overdueCount: number,
  today: string,
  examDate: string | null,
  daysPerWeek: number,
  restDays: string[],
): CatchupPlan[] {
  if (overdueCount <= 0) return [];
  const horizon = examDate ? diffDays(today, examDate) : 30;
  const days = Math.min(Math.max(horizon, 7), 60);
  const planMap = new Map<string, number>();
  let remaining = overdueCount;
  let dayIdx = 1;
  while (remaining > 0 && dayIdx <= days) {
    const date = addDaysISO(today, dayIdx);
    const dow = new Date(date + 'T12:00:00').getDay();
    if (!restDays.includes(date) && !(daysPerWeek < 7 && dow === 5)) {
      planMap.set(date, (planMap.get(date) ?? 0) + 1);
      remaining--;
    }
    dayIdx++;
  }
  // اگر همچنان مانده، بقیه را روی آخرین روز
  if (remaining > 0) {
    const last = addDaysISO(today, Math.min(days, 1));
    planMap.set(last, (planMap.get(last) ?? 0) + remaining);
  }
  return [...planMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 14);
}
