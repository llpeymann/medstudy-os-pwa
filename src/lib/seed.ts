/* ============ داده نمونه — صرفاً جهت آزمایش و آشنایی ============ */
/* این داده‌ها هیچ‌گاه به‌عنوان داده واقعی کاربر نمایش داده نمی‌شوند
   و تنها با دستور صریح کاربر از صفحه تنظیمات بارگذاری می‌شوند. */
import type { AppState } from '../types';
import { addDaysISO, todayISO } from './dates';
import { uid } from './id';

export function buildDemoState(base: AppState): AppState {
  const today = todayISO();
  const s1 = uid(); const s2 = uid(); const s3 = uid();
  const c1 = uid(); const c2 = uid(); const c3 = uid(); const c4 = uid();
  const t = (name: string, subjectId: string, chapterId: string, status: AppState['topics'][number]['studyStatus'], mastery: number, extra?: Partial<AppState['topics'][number]>) => ({
    id: uid(), subjectId, chapterId, name,
    pages: 12, startPage: 1, endPage: 12,
    priority: 'high' as const, difficulty: 'medium' as const,
    studyStatus: status, mastery,
    correctCount: 0, wrongCount: 0, unansweredCount: 0,
    lastStudyDate: status === 'not_started' ? null : addDaysISO(today, -3),
    lastReviewDate: null, nextReviewDate: status === 'initial_done' ? addDaysISO(today, 1) : null,
    notes: '', resources: '', createdAt: new Date().toISOString(),
    ...extra,
  });

  return {
    ...base,
    subjects: [
      ...base.subjects,
      { id: s1, name: 'آناتومی (نمونه)', color: '#0d9488', order: base.subjects.length + 1, createdAt: today },
      { id: s2, name: 'فیزیولوژی (نمونه)', color: '#6366f1', order: base.subjects.length + 2, createdAt: today },
      { id: s3, name: 'بیوشیمی (نمونه)', color: '#f59e0b', order: base.subjects.length + 3, createdAt: today },
    ],
    chapters: [
      ...base.chapters,
      { id: c1, subjectId: s1, name: 'فصل ۱ — سیستم اسکلتی (نمونه)', order: 1 },
      { id: c2, subjectId: s1, name: 'فصل ۲ — عضلات (نمونه)', order: 2 },
      { id: c3, subjectId: s2, name: 'فیزیولوژی قلب (نمونه)', order: 1 },
      { id: c4, subjectId: s3, name: 'متابولیسم (نمونه)', order: 1 },
    ],
    topics: [
      ...base.topics,
      t('استخوان‌بندی محوری (نمونه)', s1, c1, 'initial_done', 55),
      t('عضلات اندام فوقانی (نمونه)', s1, c2, 'in_progress', 20),
      t('چرخه قلب (نمونه)', s2, c3, 'initial_done', 65),
      t('گلیکولیز (نمونه)', s3, c4, 'mastered', 80),
      t('سیکل کربس (نمونه)', s3, c4, 'needs_review', 45),
    ],
    tasks: [
      ...base.tasks,
      {
        id: uid(), date: today, topicId: null, subjectId: s1, type: 'study' as const,
        title: 'مطالعه فصل استخوان‌بندی — صفحات ۱ تا ۱۰ (نمونه)', targetPages: 10, targetTests: null,
        done: false, spentMinutes: 0, note: '', postponeReason: null, createdAt: today, completedAt: null,
      },
      {
        id: uid(), date: today, topicId: null, subjectId: s2, type: 'review' as const,
        title: 'مرور چرخه قلب (نمونه)', targetPages: null, targetTests: null,
        done: true, spentMinutes: 30, note: '', postponeReason: null, createdAt: today, completedAt: today,
      },
    ],
    tests: [
      ...base.tests,
      {
        id: uid(), subjectId: s3, topicId: null, date: addDaysISO(today, -1),
        total: 20, correct: 14, wrong: 4, unanswered: 2,
        durationMinutes: 25, source: 'نمونه (پیش‌آزمون)', note: '', createdAt: today,
      },
    ],
    reviews: [
      ...base.reviews,
      {
        id: uid(), topicId: base.topics[0]?.id ?? 'demo', reviewNumber: 1,
        scheduledDate: today, doneDate: null, result: null, mastery: null,
        durationMinutes: null, needsReviewAgain: false, errorNotes: '', status: 'pending',
      },
    ],
    settings: { ...base.settings },
  };
}
