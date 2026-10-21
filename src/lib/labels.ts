/* ---------- برچسب‌های فارسی وضعیت‌ها ---------- */
import type { Difficulty, MistakeCategory, Priority, ReviewResult, StudyStatus, TaskType } from '../types';

export const STUDY_STATUSES: { value: StudyStatus; label: string; tone: string }[] = [
  { value: 'not_started', label: 'مطالعه‌نشده', tone: 'gray' },
  { value: 'in_progress', label: 'در حال مطالعه', tone: 'sky' },
  { value: 'initial_done', label: 'مطالعه اولیه تمام شده', tone: 'indigo' },
  { value: 'needs_review', label: 'نیازمند مرور', tone: 'amber' },
  { value: 'mastered', label: 'تسلط مناسب', tone: 'emerald' },
  { value: 'needs_more_tests', label: 'نیازمند تست بیشتر', tone: 'violet' },
];

export const studyStatusLabel = (s: StudyStatus): string =>
  STUDY_STATUSES.find((x) => x.value === s)?.label ?? s;
export const studyStatusTone = (s: StudyStatus): string =>
  STUDY_STATUSES.find((x) => x.value === s)?.tone ?? 'gray';

export const PRIORITIES: { value: Priority; label: string; tone: string }[] = [
  { value: 'low', label: 'پایین', tone: 'gray' },
  { value: 'medium', label: 'متوسط', tone: 'sky' },
  { value: 'high', label: 'بالا', tone: 'amber' },
  { value: 'critical', label: 'بحرانی', tone: 'rose' },
];
export const priorityLabel = (p: Priority) => PRIORITIES.find((x) => x.value === p)?.label ?? p;
export const priorityTone = (p: Priority) => PRIORITIES.find((x) => x.value === p)?.tone ?? 'gray';

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'آسان' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'سخت' },
];
export const difficultyLabel = (d: Difficulty) => DIFFICULTIES.find((x) => x.value === d)?.label ?? d;

export const REVIEW_RESULTS_FA: Record<ReviewResult, string> = {
  good: 'خوب', ok: 'متوسط', poor: 'ضعیف', forgotten: 'فراموش شده',
};

export const TASK_TYPES_FA: Record<TaskType, string> = {
  study: 'مطالعه', review: 'مرور', test: 'تست', custom: 'سفارشی',
};

export const MISTAKE_CATEGORIES: { value: MistakeCategory; label: string }[] = [
  { value: 'knowledge_gap', label: 'ضعف علمی' },
  { value: 'forgetfulness', label: 'فراموشی' },
  { value: 'carelessness', label: 'بی‌دقتی' },
  { value: 'misunderstanding', label: 'اشتباه در فهم سؤال' },
  { value: 'time_shortage', label: 'کمبود زمان' },
  { value: 'hesitation', label: 'شک بین گزینه‌ها' },
];
export const mistakeLabel = (c: MistakeCategory) =>
  MISTAKE_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const SUBJECT_COLORS = [
  '#0d9488', '#6366f1', '#f59e0b', '#e11d48', '#0284c7',
  '#7c3aed', '#059669', '#db2777', '#ea580c', '#475569',
];
