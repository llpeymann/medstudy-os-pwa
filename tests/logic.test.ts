/* ============ آزمون‌های واحد منطق محاسباتی ============ */
import { describe, it, expect } from 'vitest';
import { percent, overallProgress, testStats, testPercentages, validateTestInput, weeklyActivity, studyStreak } from '../src/lib/progress';
import {
  createInitialSchedule, nextIntervalDays, nextScheduledDate, nextReviewNumber,
  reviewBuckets, reviewBucket, overdueReviews, resultNeedsRepeat, suggestCatchupPlan,
} from '../src/lib/reviews';
import { toJalaali, toGregorian, isValidJalaaliDate } from '../src/lib/jalaali';
import { addDaysISO, diffDays, todayISO, fromJalaaliToISO, formatDate, weekDaysISO, monthDays } from '../src/lib/dates';
import { validateBackup, buildBackup, summarizeBackup } from '../src/lib/backup';
import { EMPTY_STATE } from '../src/state/store';
import type { AppState, ReviewEntry, Topic } from '../src/types';

const T = (partial: Partial<Topic>): Topic => ({
  id: 't1', subjectId: 's1', chapterId: 'c1', name: 'مبحث آزمایشی',
  pages: 10, startPage: 1, endPage: 10,
  priority: 'high', difficulty: 'medium',
  studyStatus: 'not_started', mastery: 0,
  correctCount: 0, wrongCount: 0, unansweredCount: 0,
  lastStudyDate: null, lastReviewDate: null, nextReviewDate: null,
  notes: '', resources: '', createdAt: '2025-01-01T00:00:00Z',
  ...partial,
});

describe('محاسبات درصد و پیشرفت', () => {
  it('درصد با مخرج صفر = ۰ (بدون خطا)', () => {
    expect(percent(5, 0)).toBe(0);
    expect(percent(0, 0)).toBe(0);
    expect(percent(1, 4)).toBe(25);
    expect(percent(-5, 10)).toBe(0);
    expect(percent(150, 100)).toBe(100);
  });

  it('پیشرفت کل: مطالعه، مرور و تسلط شاخص‌های جداگانه‌اند', () => {
    const state: AppState = {
      ...EMPTY_STATE,
      topics: [
        T({ id: 'a', studyStatus: 'initial_done', mastery: 80 }),
        T({ id: 'b', studyStatus: 'in_progress', mastery: 30 }),
        T({ id: 'c', studyStatus: 'not_started', mastery: 0 }),
      ],
      reviews: [{
        id: 'r1', topicId: 'a', reviewNumber: 1, scheduledDate: '2025-01-02',
        doneDate: '2025-01-02', result: 'good', mastery: 80, durationMinutes: 10,
        needsReviewAgain: false, errorNotes: '', status: 'done',
      }],
    };
    const p = overallProgress(state);
    expect(p.totalTopics).toBe(3);
    expect(p.studied).toBe(1);          // فقط initial_done
    expect(p.studiedPct).toBeCloseTo(33.3);
    expect(p.reviewed).toBe(1);         // یک مرور انجام‌شده
    expect(p.mastered).toBe(1);         // تسلط ۸۰ ≥ ۷۰
    expect(p.masteredPct).toBeCloseTo(33.3);
  });

  it('پیشرفت وزن‌دار بر اساس صفحات', () => {
    const state: AppState = {
      ...EMPTY_STATE,
      topics: [
        T({ id: 'a', pages: 30, studyStatus: 'initial_done' }),
        T({ id: 'b', pages: 10, studyStatus: 'not_started' }),
      ],
    };
    const p = overallProgress(state);
    expect(p.studiedPct).toBe(50);        // بدون وزن
    expect(p.studiedWeightedPct).toBe(75); // وزن‌دار: ۳۰ از ۴۰
  });

  it('درصد تست با فرمول صحیح و محافظت از صفر', () => {
    expect(testPercentages({ id: 'x', subjectId: null, topicId: null, date: '2025-01-01', total: 20, correct: 14, wrong: 4, unanswered: 2, durationMinutes: 10, source: '', note: '', createdAt: '' })).toEqual({ correct: 70, wrong: 20, unanswered: 10 });
    expect(testPercentages({ id: 'x', subjectId: null, topicId: null, date: '2025-01-01', total: 0, correct: 0, wrong: 0, unanswered: 0, durationMinutes: 0, source: '', note: '', createdAt: '' })).toEqual({ correct: 0, wrong: 0, unanswered: 0 });
  });

  it('آمار تجمعی تست‌ها', () => {
    const s = testStats([
      { id: '1', subjectId: null, topicId: null, date: '2025-01-01', total: 20, correct: 10, wrong: 8, unanswered: 2, durationMinutes: 20, source: '', note: '', createdAt: '' },
      { id: '2', subjectId: null, topicId: null, date: '2025-01-02', total: 10, correct: 5, wrong: 5, unanswered: 0, durationMinutes: 10, source: '', note: '', createdAt: '' },
    ]);
    expect(s.totalQuestions).toBe(30);
    expect(s.correctPct).toBe(50);
    expect(s.avgDuration).toBe(15);
  });

  it('اعتبارسنجی ورودی تست', () => {
    expect(validateTestInput(20, 10, 8, 2)).toBeNull();
    expect(validateTestInput(20, 10, 8, 3)).not.toBeNull(); // مجموع بیشتر از کل
    expect(validateTestInput(-1, 0, 0, 0)).not.toBeNull();
    expect(validateTestInput(20, -1, 0, 0)).not.toBeNull();
  });

  it('فعالیت هفتگی و سری مطالعه', () => {
    const today = todayISO();
    const state: AppState = {
      ...EMPTY_STATE,
      sessions: [
        { id: '1', subjectId: null, topicId: null, date: today, durationMinutes: 30, pagesStudied: null, selfAssessment: null, note: '', startedAt: today },
        { id: '2', subjectId: null, topicId: null, date: today, durationMinutes: 15, pagesStudied: null, selfAssessment: null, note: '', startedAt: today },
      ],
    };
    const week = weeklyActivity(state);
    expect(week).toHaveLength(7);
    expect(week[6].minutes).toBe(45);
    expect(studyStreak(state)).toBe(1);
  });
});

describe('موتور مرور فاصله‌دار', () => {
  it('برنامه اولیه: مرور نخست ۱ روز بعد از مطالعه (مدل تدریجی)', () => {
    const sched = createInitialSchedule('t1', '2025-06-01', [1, 3, 7, 14, 30]);
    expect(sched.map((r) => r.scheduledDate)).toEqual(['2025-06-02']);
    expect(sched[0].reviewNumber).toBe(1);
    expect(sched.every((r) => r.status === 'pending')).toBe(true);
    expect(sched.every((r) => r.topicId === 't1')).toBe(true);
  });

  it('فاصله بعدی بر اساس نتیجه', () => {
    expect(nextIntervalDays(2, 'good', [1, 3, 7, 14])).toBe(7);
    expect(nextIntervalDays(1, 'poor', [1, 3, 7, 14])).toBe(1);
    expect(nextIntervalDays(1, 'forgotten', [1, 3, 7, 14])).toBe(1);
    expect(nextIntervalDays(99, 'good', [1, 3, 7])).toBe(11); // ۱.۵ برابر آخری (۷×۱.۵=۱۰.۵→۱۱)
  });

  it('شماره مرور بعدی: نتیجه ضعیف = تکرار، خوب = ادامه', () => {
    expect(nextReviewNumber('good', 1)).toBe(2);
    expect(nextReviewNumber('poor', 3)).toBe(2);
    expect(nextReviewNumber('forgotten', 3)).toBe(2);
    expect(resultNeedsRepeat('poor')).toBe(true);
    expect(resultNeedsRepeat('ok')).toBe(false);
  });

  it('تاریخ مرور بعدی از تاریخ انجام محاسبه می‌شود', () => {
    expect(nextScheduledDate('2025-06-01', 'good', 2, [1, 3, 7, 14])).toBe('2025-06-08');
  });

  it('دسته‌بندی سطل‌های مرور', () => {
    const mk = (id: string, date: string, status: ReviewEntry['status'], doneDate: string | null = null): ReviewEntry =>
      ({ id, topicId: 't1', reviewNumber: 1, scheduledDate: date, doneDate, result: null, mastery: null, durationMinutes: null, needsReviewAgain: false, errorNotes: '', status });
    const today = '2025-06-10';
    const buckets = reviewBuckets({
      ...EMPTY_STATE,
      reviews: [
        mk('a', today, 'pending'),          // امروز
        mk('b', '2025-06-08', 'pending'),   // عقب‌افتاده
        mk('c', '2025-06-20', 'pending'),   // آینده
        mk('d', today, 'done', today),      // انجام‌شده امروز
      ] as ReviewEntry[],
    }, today);
    expect(buckets.dueToday.map((r) => r.id)).toEqual(['a']);
    expect(buckets.overdue.map((r) => r.id)).toEqual(['b']);
    expect(buckets.upcoming.map((r) => r.id)).toEqual(['c']);
    expect(buckets.doneToday.map((r) => r.id)).toEqual(['d']);
  });

  it('مرور عقب‌افتاده حذف یا جابه‌جا نمی‌شود', () => {
    const today = '2025-06-10';
    const r: ReviewEntry = {
      id: 'x', topicId: 't1', reviewNumber: 1, scheduledDate: '2025-06-05',
      doneDate: null, result: null, mastery: null, durationMinutes: null,
      needsReviewAgain: false, errorNotes: '', status: 'pending',
    };
    expect(overdueReviews({ ...EMPTY_STATE, reviews: [r] }, today)).toHaveLength(1);
    expect(reviewBucket(r, today)).toBe('overdue');
    expect(reviewBucket(r, '2025-06-05')).toBe('dueToday');
    expect(reviewBucket(r, '2025-06-20')).toBe('overdue'); // در گذشته می‌ماند
    expect(reviewBucket(r, '2025-06-04')).toBe('upcoming');
    expect(reviewBucket({ ...r, status: 'done' }, today)).toBe('done');
  });

  it('پیشنهاد جبران وظایف با رعایت سقف و روز استراحت', () => {
    const plan = suggestCatchupPlan(10, '2025-06-10', '2025-07-10', 7, ['2025-06-13']);
    expect(plan.length).toBeGreaterThan(0);
    const total = plan.reduce((a, p) => a + p.count, 0);
    expect(total).toBe(10);
    expect(plan.every((p) => p.date > '2025-06-10')).toBe(true); // هیچ‌وقت روی گذشته
    expect(plan.find((p) => p.date === '2025-06-13')).toBeUndefined(); // روز استراحت
  });
});

describe('تقویم شمسی', () => {
  it('تبدیل میلادی ↔ شمسی دقیق (تطابق با jalaali-js مرجع)', () => {
    // مقادیر مرجع از کتابخانه jalaali-js v1.2.0 (الگوریتم Borkowski)
    expect(toJalaali(2025, 3, 20)).toEqual({ jy: 1403, jm: 12, jd: 30 });
    expect(toJalaali(2025, 3, 21)).toEqual({ jy: 1404, jm: 1, jd: 1 });
    expect(toGregorian(1404, 1, 1)).toEqual({ gy: 2025, gm: 3, gd: 21 });
    expect(toJalaali(2016, 4, 11)).toEqual({ jy: 1395, jm: 1, jd: 23 });
    expect(toGregorian(1395, 1, 23)).toEqual({ gy: 2016, gm: 4, gd: 11 });
    expect(toJalaali(2025, 6, 10)).toEqual({ jy: 1404, jm: 3, jd: 20 });
    expect(toJalaali(2000, 1, 1)).toEqual({ jy: 1378, jm: 10, jd: 11 });
    // ۱۵ اسفند ۱۴۰۳ = ۵ مارس ۲۰۲۵
    expect(toJalaali(2025, 3, 5)).toEqual({ jy: 1403, jm: 12, jd: 15 });
    // اعتبارسنجی کبیسه — تطابق با مرجع
    expect(isValidJalaaliDate(1399, 12, 30)).toBe(true);
    expect(isValidJalaaliDate(1403, 12, 30)).toBe(true);
    expect(isValidJalaaliDate(1404, 12, 30)).toBe(false);
    expect(isValidJalaaliDate(1402, 12, 30)).toBe(false);
    expect(isValidJalaaliDate(1404, 1, 1)).toBe(true);
    expect(isValidJalaaliDate(1404, 7, 31)).toBe(false);
  });

  it('فرمت‌بندی و تاریخ‌ها', () => {
    expect(formatDate('2025-06-10', 'jalali')).toBe('۲۰ خرداد ۱۴۰۴');
    expect(formatDate('2025-06-10', 'gregorian')).toBe('۱۰ June ۲۰۲۵');
    expect(formatDate(null, 'jalali')).toBe('—');
    expect(addDaysISO('2025-06-10', 3)).toBe('2025-06-13');
    expect(diffDays('2025-06-10', '2025-06-13')).toBe(3);
    expect(fromJalaaliToISO(1404, 1, 1)).toBe('2025-03-21');
    expect(fromJalaaliToISO(1404, 2, 31)).toBe('2025-05-21');
    expect(fromJalaaliToISO(1404, 12, 30)).toBeNull(); // تاریخ نامعتبر
    // تقویم ماه شمسی: اسفند ۱۴۰۳ (کبیسه) ۳۰ روزه، اسفند ۱۴۰۴ ۲۹ روزه
    expect(monthDays(1403, 12, 'jalali')).toHaveLength(30);
    expect(monthDays(1404, 12, 'jalali')).toHaveLength(29);
    expect(monthDays(1404, 1, 'jalali')).toHaveLength(31);
    expect(monthDays(2025, 2, 'gregorian')).toHaveLength(28);
  });

  it('هفته از شنبه شروع می‌شود', () => {
    const week = weekDaysISO('2025-06-10'); // سه‌شنبه
    expect(week[0]).toBe('2025-06-07'); // شنبه همان هفته
    expect(week).toHaveLength(7);
  });
});

describe('نسخه پشتیبان', () => {
  it('ساخت و اعتبارسنجی فایل پشتیبان', () => {
    const json = buildBackup(EMPTY_STATE);
    const parsed = JSON.parse(json);
    const check = validateBackup(parsed);
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.summary.subjects).toBe(0);
      expect(check.summary.app).toBe('medstudy-os');
    }
    expect(summarizeBackup(parsed).version).toBe(1);
  });

  it('رد فایل‌های نامعتبر و ناسازگار', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup({ app: 'other', version: 1 }).ok).toBe(false);
    expect(validateBackup({ app: 'medstudy-os', version: 99, exportedAt: 'x', data: {} }).ok).toBe(false);
    expect(validateBackup({ app: 'medstudy-os', version: 1, exportedAt: 'x' }).ok).toBe(false); // بدون data
    expect(validateBackup({ app: 'medstudy-os', version: 1, exportedAt: 'x', data: { subjects: [] } }).ok).toBe(false); // ناقص
  });
});
