/* ============ محاسبات پیشرفت و آمار — منطق خالص بدون وابستگی به رابط ============ */
import type { AppState, StudyStatus, TestSession, Topic, Task } from '../types';
import { diffDays, todayISO, addDaysISO, fromISODate } from './dates';

/** درصد با محافظت در برابر تقسیم بر صفر */
export function percent(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  const p = (numerator / denominator) * 100;
  return Math.round(Math.min(100, Math.max(0, p)) * 10) / 10;
}

export const STUDIED_STATUSES: StudyStatus[] = ['initial_done', 'needs_review', 'mastered', 'needs_more_tests'];

export function isStudied(t: Topic): boolean {
  return STUDIED_STATUSES.includes(t.studyStatus);
}

/** آیا مبحث تسلط مناسب دارد؟ (بر اساس آستانه تنظیمات) */
export function isMastered(t: Topic, threshold: number): boolean {
  return t.mastery >= threshold;
}

export interface OverallProgress {
  totalTopics: number;
  studied: number;
  studiedPct: number;           // درصد مطالعه (وزن‌نداشته)
  studiedWeightedPct: number;   // درصد مطالعه وزن‌دار (بر اساس صفحات)
  reviewed: number;             // مباحث با حداقل یک مرور انجام‌شده
  reviewedPct: number;
  mastered: number;             // مباحث با تسلط مناسب
  masteredPct: number;
  notStarted: number;
  inProgress: number;
  needsReview: number;
  needsMoreTests: number;
}

export function overallProgress(state: AppState): OverallProgress {
  const topics = state.topics;
  const total = topics.length;
  const studied = topics.filter(isStudied).length;
  const reviewed = topics.filter((t) =>
    state.reviews.some((r) => r.topicId === t.id && r.status === 'done'),
  ).length;
  const mastered = topics.filter((t) => isMastered(t, state.settings.masteredThreshold)).length;

  // وزن‌دهی بر اساس صفحات (فقط برای مباحثی که صفحه مشخص دارند)
  const withPages = topics.filter((t) => t.pages && t.pages > 0);
  const weighted = withPages.length
    ? percent(
        withPages.filter(isStudied).reduce((s, t) => s + (t.pages ?? 0), 0),
        withPages.reduce((s, t) => s + (t.pages ?? 0), 0),
      )
    : 0;

  return {
    totalTopics: total,
    studied,
    studiedPct: percent(studied, total),
    studiedWeightedPct: weighted,
    reviewed,
    reviewedPct: percent(reviewed, total),
    mastered,
    masteredPct: percent(mastered, total),
    notStarted: topics.filter((t) => t.studyStatus === 'not_started').length,
    inProgress: topics.filter((t) => t.studyStatus === 'in_progress').length,
    needsReview: topics.filter((t) => t.studyStatus === 'needs_review').length,
    needsMoreTests: topics.filter((t) => t.studyStatus === 'needs_more_tests').length,
  };
}

export interface SubjectProgress {
  subjectId: string;
  totalTopics: number;
  studiedPct: number;
  masteryAvg: number;
  studiedMinutes: number;
  testCorrectPct: number;
}

export function subjectProgress(state: AppState): SubjectProgress[] {
  return state.subjects.map((s) => {
    const topics = state.topics.filter((t) => t.subjectId === s.id);
    const studied = topics.filter(isStudied).length;
    const masteryAvg = topics.length
      ? Math.round(topics.reduce((a, t) => a + t.mastery, 0) / topics.length)
      : 0;
    const tests = state.tests.filter((x) => x.subjectId === s.id);
    const tot = tests.reduce((a, x) => a + x.total, 0);
    const cor = tests.reduce((a, x) => a + x.correct, 0);
    return {
      subjectId: s.id,
      totalTopics: topics.length,
      studiedPct: percent(studied, topics.length),
      masteryAvg,
      studiedMinutes: 0, // تکمیل می‌شود در sessionsBySubject
      testCorrectPct: percent(cor, tot),
    };
  });
}

/** مجموع زمان مطالعه ثبت‌شده (دقیقه) */
export function totalStudyMinutes(state: AppState): number {
  return state.sessions.reduce((a, s) => a + s.durationMinutes, 0);
}

export function sessionsBySubject(state: AppState): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of state.sessions) {
    if (s.subjectId) map[s.subjectId] = (map[s.subjectId] ?? 0) + s.durationMinutes;
  }
  return map;
}

/** آمار تست‌ها */
export interface TestStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  correctPct: number;
  wrongPct: number;
  unansweredPct: number;
  avgDuration: number;
}

export function testStats(tests: TestSession[]): TestStats {
  const totalQuestions = tests.reduce((a, t) => a + t.total, 0);
  const correct = tests.reduce((a, t) => a + t.correct, 0);
  const wrong = tests.reduce((a, t) => a + t.wrong, 0);
  const unanswered = tests.reduce((a, t) => a + t.unanswered, 0);
  return {
    totalSessions: tests.length,
    totalQuestions,
    totalCorrect: correct,
    totalWrong: wrong,
    totalUnanswered: unanswered,
    correctPct: percent(correct, totalQuestions),
    wrongPct: percent(wrong, totalQuestions),
    unansweredPct: percent(unanswered, totalQuestions),
    avgDuration: tests.length
      ? Math.round(tests.reduce((a, t) => a + t.durationMinutes, 0) / tests.length)
      : 0,
  };
}

/** درصد یک جلسه تست — فرمول صحیح با محافظت از تقسیم بر صفر */
export function testPercentages(t: TestSession): { correct: number; wrong: number; unanswered: number } {
  return {
    correct: percent(t.correct, t.total),
    wrong: percent(t.wrong, t.total),
    unanswered: percent(t.unanswered, t.total),
  };
}

/** فعالیت هفتگی: دقیقه مطالعه per روز — n روز گذشته شامل امروز */
export function weeklyActivity(state: AppState, days = 7): { iso: string; label: string; minutes: number }[] {
  const today = todayISO();
  const out: { iso: string; label: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysISO(today, -i);
    const minutes = state.sessions
      .filter((s) => s.date === iso)
      .reduce((a, s) => a + s.durationMinutes, 0);
    const d = fromISODate(iso);
    out.push({ iso, label: `${d.getDate()}/${d.getMonth() + 1}`, minutes });
  }
  return out;
}

/** روند درصد صحیح تست‌ها در n جلسه آخر */
export function testTrend(state: AppState, last = 10): { label: string; pct: number }[] {
  const sorted = [...state.tests].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-last).map((t, i) => ({
    label: String(t.total ? Math.round((t.correct / t.total) * 100) : 0),
    pct: percent(t.correct, t.total),
  }));
}

/** سری‌ترین مطالعه (روزهای متوالی با حداقل یک جلسه) */
export function studyStreak(state: AppState): number {
  const days = new Set(state.sessions.map((s) => s.date));
  let streak = 0;
  let cur = todayISO();
  // اگر امروز مطالعه نشده، از دیروز شروع بشمار
  if (!days.has(cur)) cur = addDaysISO(cur, -1);
  while (days.has(cur)) {
    streak++;
    cur = addDaysISO(cur, -1);
  }
  return streak;
}

/** وضعیت وظایف امروز */
export function taskStats(tasks: Task[], today: string): { done: number; remaining: number; total: number } {
  const todayTasks = tasks.filter((t) => t.date === today);
  return {
    done: todayTasks.filter((t) => t.done).length,
    remaining: todayTasks.filter((t) => !t.done).length,
    total: todayTasks.length,
  };
}

/** آخرین فعالیت‌ها (ترکیبی از جلسات، تست‌ها، مرورها) */
export interface ActivityItem {
  id: string;
  date: string;
  kind: 'session' | 'test' | 'review' | 'task';
  text: string;
  color: string;
}

export function recentActivity(state: AppState, limit = 8): ActivityItem[] {
  const items: ActivityItem[] = [];
  const topicName = (id: string | null) =>
    id ? state.topics.find((t) => t.id === id)?.name ?? 'مبحث نامشخص' : '—';
  const subjectName = (id: string | null) =>
    id ? state.subjects.find((s) => s.id === id)?.name ?? 'درس نامشخص' : '';

  for (const s of state.sessions) {
    items.push({
      id: `s-${s.id}`, date: s.date, kind: 'session', color: 'sky',
      text: `جلسه مطالعه: ${topicName(s.topicId)} ${s.subjectId ? '· ' + subjectName(s.subjectId) : ''} (${s.durationMinutes} دقیقه)`,
    });
  }
  for (const t of state.tests) {
    items.push({
      id: `t-${t.id}`, date: t.date, kind: 'test', color: 'emerald',
      text: `ثبت تست: ${topicName(t.topicId)} — ${t.correct}/${t.total} صحیح`,
    });
  }
  for (const r of state.reviews.filter((x) => x.doneDate)) {
    items.push({
      id: `r-${r.id}`, date: r.doneDate!, kind: 'review', color: 'violet',
      text: `مرور انجام‌شده: ${topicName(r.topicId)} (مرور ${r.reviewNumber})`,
    });
  }
  for (const t of state.tasks.filter((x) => x.done && x.completedAt)) {
    items.push({
      id: `k-${t.id}`, date: t.date, kind: 'task', color: 'amber',
      text: `وظیفه انجام‌شده: ${t.title}`,
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** بررسی صحت ورودی تست: صحیح+غلط+بدون‌پاسخ = کل */
export function validateTestInput(total: number, correct: number, wrong: number, unanswered: number): string | null {
  if (!Number.isFinite(total) || total < 0) return 'تعداد کل باید عددی نامنفی باشد.';
  if (correct < 0 || wrong < 0 || unanswered < 0) return 'اعداد نمی‌توانند منفی باشند.';
  if (correct + wrong + unanswered > total) return 'مجموع صحیح، غلط و بدون‌پاسخ نمی‌تواند بیشتر از کل باشد.';
  return null;
}

export { diffDays };
