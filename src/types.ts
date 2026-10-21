/* ============ مدل داده MEDSTUDY OS ============ */

export type ID = string;

export type ThemeMode = 'light' | 'dark' | 'system';
export type CalendarMode = 'jalali' | 'gregorian';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Difficulty = 'easy' | 'medium' | 'hard';

/** وضعیت مطالعه یک مبحث — مستقل از تسلط */
export type StudyStatus =
  | 'not_started'      // مطالعه‌نشده
  | 'in_progress'      // در حال مطالعه
  | 'initial_done'     // مطالعه اولیه تمام شده
  | 'needs_review'     // نیازمند مرور
  | 'mastered'         // تسلط مناسب
  | 'needs_more_tests';// نیازمند تست بیشتر

/** نتیجه یک جلسه مرور */
export type ReviewResult = 'good' | 'ok' | 'poor' | 'forgotten';

export type TaskType = 'study' | 'review' | 'test' | 'custom';

export type MistakeCategory =
  | 'knowledge_gap'     // ضعف علمی
  | 'forgetfulness'     // فراموشی
  | 'carelessness'      // بی‌دقتی
  | 'misunderstanding'  // اشتباه در فهم سؤال
  | 'time_shortage'     // کمبود زمان
  | 'hesitation';       // شک بین گزینه‌ها

/* ---------- درس ---------- */
export interface Subject {
  id: ID;
  name: string;
  color: string; // کد رنگ hex
  order: number;
  createdAt: string; // ISO
}

/* ---------- فصل ---------- */
export interface Chapter {
  id: ID;
  subjectId: ID;
  name: string;
  order: number;
}

/* ---------- مبحث ---------- */
export interface Topic {
  id: ID;
  subjectId: ID;
  chapterId: ID;
  name: string;
  pages: number | null;        // تعداد صفحات (در صورت مشخص‌بودن)
  startPage: number | null;
  endPage: number | null;
  priority: Priority;
  difficulty: Difficulty;
  studyStatus: StudyStatus;
  mastery: number;             // 0..100 — مستقل از وضعیت مطالعه
  correctCount: number;        // تجمع از تست‌ها
  wrongCount: number;
  unansweredCount: number;
  lastStudyDate: string | null;   // ISO date
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  notes: string;
  resources: string;
  createdAt: string;
}

/* ---------- برنامه مرور فاصله‌دار ---------- */
export interface ReviewEntry {
  id: ID;
  topicId: ID;
  reviewNumber: number;      // 1، 2، 3، ...
  scheduledDate: string;     // ISO date — موعد
  doneDate: string | null;   // ISO date — تاریخ انجام
  result: ReviewResult | null;
  mastery: number | null;
  durationMinutes: number | null;
  needsReviewAgain: boolean;
  errorNotes: string;
  status: 'pending' | 'done' | 'skipped';
}

/* ---------- وظیفه روزانه ---------- */
export interface Task {
  id: ID;
  date: string;              // ISO date — روز برنامه‌ریزی‌شده
  topicId: ID | null;
  subjectId: ID | null;
  type: TaskType;
  title: string;
  targetPages: number | null;
  targetTests: number | null;
  done: boolean;
  spentMinutes: number;
  note: string;
  postponeReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

/* ---------- جلسه تست ---------- */
export interface TestSession {
  id: ID;
  subjectId: ID | null;
  topicId: ID | null;
  date: string;              // ISO date
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  durationMinutes: number;
  source: string;
  note: string;
  createdAt: string;
}

/* ---------- اشتباه ---------- */
export interface Mistake {
  id: ID;
  subjectId: ID | null;
  topicId: ID | null;
  questionText: string;
  correctAnswer: string;
  category: MistakeCategory;
  resolved: boolean;
  date: string;
  note: string;
  createdAt: string;
}

/* ---------- جلسه مطالعه ---------- */
export interface StudySession {
  id: ID;
  subjectId: ID | null;
  topicId: ID | null;
  date: string;              // ISO date
  durationMinutes: number;
  pagesStudied: number | null;
  selfAssessment: number | null; // 1..5
  note: string;
  startedAt: string;         // ISO datetime
}

/* ---------- روز استراحت ---------- */
export interface RestDay {
  date: string; // ISO date
  note: string;
}

export interface Settings {
  appName: string;
  examDate: string | null;      // ISO date
  theme: ThemeMode;
  calendar: CalendarMode;
  studyDaysPerWeek: number;
  dailyTaskCap: number;
  dailyGoalMinutes: number;
  reviewIntervals: number[];    // روزهای فاصله مرور — پیشنهاد پیش‌فرض قابل تغییر
  masteredThreshold: number;    // آستانه تسلط (پیش‌فرض ۷۰)
  chartsEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface AppState {
  version: number;
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  reviews: ReviewEntry[];
  tasks: Task[];
  tests: TestSession[];
  mistakes: Mistake[];
  sessions: StudySession[];
  restDays: RestDay[];
  settings: Settings;
}

/* ---------- وضعیت تایمر (ذخیره‌سازی جدا برای مقاومت در برابر رفرش) ---------- */
export interface TimerState {
  subjectId: ID | null;
  topicId: ID | null;
  startedAt: number;      // timestamp — لحظه شروع/ادامه
  accumulatedMs: number;  // زمان انباشته‌شده قبل از توقف موقت
  running: boolean;
  note: string;
}
