/* ============ مخزن مرکزی وضعیت — Context + Reducer + ذخیره خودکار ============ */
import React, {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback,
} from 'react';
import type {
  AppState, Chapter, ID, Mistake, ReviewEntry, ReviewResult, Settings,
  StudySession, Subject, Task, TestSession, Topic, TimerState,
} from '../types';
import { saveState, loadState, saveTimer, loadTimer, clearTimer, storageBackend } from '../lib/db';
import { todayISO, addDaysISO } from '../lib/dates';
import { createInitialSchedule, nextScheduledDate, nextReviewNumber } from '../lib/reviews';
import { uid } from '../lib/id';
import { buildDemoState } from '../lib/seed';

export const DEFAULT_SETTINGS: Settings = {
  appName: 'MEDSTUDY OS',
  examDate: null,
  theme: 'system',
  calendar: 'jalali',
  studyDaysPerWeek: 7,
  dailyTaskCap: 12,
  dailyGoalMinutes: 180,
  reviewIntervals: [1, 3, 7, 14, 30, 30, 60, 60],
  masteredThreshold: 70,
  chartsEnabled: true,
  notificationsEnabled: true,
};

export const EMPTY_STATE: AppState = {
  version: 1,
  subjects: [],
  chapters: [],
  topics: [],
  reviews: [],
  tasks: [],
  tests: [],
  mistakes: [],
  sessions: [],
  restDays: [],
  settings: DEFAULT_SETTINGS,
};

/* ---------------- اقدامات ---------------- */
export type Action =
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'ADD_SUBJECT'; subject: Subject }
  | { type: 'UPDATE_SUBJECT'; subject: Subject }
  | { type: 'DELETE_SUBJECT'; id: ID }
  | { type: 'MOVE_SUBJECT'; id: ID; dir: -1 | 1 }
  | { type: 'ADD_CHAPTER'; chapter: Chapter }
  | { type: 'UPDATE_CHAPTER'; chapter: Chapter }
  | { type: 'DELETE_CHAPTER'; id: ID }
  | { type: 'MOVE_CHAPTER'; id: ID; dir: -1 | 1 }
  | { type: 'ADD_TOPIC'; topic: Topic }
  | { type: 'UPDATE_TOPIC'; topic: Topic }
  | { type: 'DELETE_TOPIC'; id: ID }
  | { type: 'SET_STUDY_STATUS'; topicId: ID; status: Topic['studyStatus']; date: string }
  | { type: 'SET_MASTERY'; topicId: ID; mastery: number }
  | { type: 'LOG_SESSION'; session: StudySession }
  | { type: 'COMPLETE_REVIEW'; id: ID; result: ReviewResult; mastery: number; durationMinutes: number; needsReviewAgain: boolean; errorNotes: string; doneDate: string }
  | { type: 'SKIP_REVIEW'; id: ID }
  | { type: 'RESCHEDULE_REVIEW'; id: ID; newDate: string }
  | { type: 'ADD_REVIEW'; review: ReviewEntry }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; task: Task }
  | { type: 'TOGGLE_TASK'; id: ID; today: string }
  | { type: 'DELETE_TASK'; id: ID }
  | { type: 'ADD_TEST'; test: TestSession }
  | { type: 'DELETE_TEST'; id: ID }
  | { type: 'DELETE_SESSION'; id: ID }
  | { type: 'ADD_MISTAKE'; mistake: Mistake }
  | { type: 'UPDATE_MISTAKE'; mistake: Mistake }
  | { type: 'DELETE_MISTAKE'; id: ID }
  | { type: 'TOGGLE_REST_DAY'; date: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'SEED_DEMO' }
  | { type: 'RESET' };

function updateTopic(topics: Topic[], id: ID, fn: (t: Topic) => Topic): Topic[] {
  return topics.map((t) => (t.id === id ? fn(t) : t));
}

function updateTask(tasks: Task[], id: ID, fn: (t: Task) => Task): Task[] {
  return tasks.map((t) => (t.id === id ? fn(t) : t));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'ADD_SUBJECT':
      return { ...state, subjects: [...state.subjects, action.subject] };

    case 'UPDATE_SUBJECT':
      return { ...state, subjects: state.subjects.map((s) => (s.id === action.subject.id ? action.subject : s)) };

    case 'DELETE_SUBJECT': {
      const chapterIds = new Set(state.chapters.filter((c) => c.subjectId === action.id).map((c) => c.id));
      const topicIds = new Set(state.topics.filter((t) => t.subjectId === action.id || chapterIds.has(t.chapterId)).map((t) => t.id));
      return {
        ...state,
        subjects: state.subjects.filter((s) => s.id !== action.id),
        chapters: state.chapters.filter((c) => c.subjectId !== action.id),
        topics: state.topics.filter((t) => !topicIds.has(t.id)),
        reviews: state.reviews.filter((r) => !topicIds.has(r.topicId)),
        tasks: state.tasks.filter((t) => t.subjectId !== action.id && !t.topicId),
        tests: state.tests.filter((t) => t.subjectId !== action.id && !t.topicId),
        mistakes: state.mistakes.filter((m) => m.subjectId !== action.id && !m.topicId),
        sessions: state.sessions.filter((s) => s.subjectId !== action.id && !s.topicId),
      };
    }

    case 'MOVE_SUBJECT': {
      const sorted = [...state.subjects].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === action.id);
      const swap = idx + action.dir;
      if (idx < 0 || swap < 0 || swap >= sorted.length) return state;
      [sorted[idx], sorted[swap]] = [sorted[swap], sorted[idx]];
      const orderMap = new Map(sorted.map((s, i) => [s.id, i + 1]));
      return { ...state, subjects: state.subjects.map((s) => ({ ...s, order: orderMap.get(s.id)! })) };
    }

    case 'ADD_CHAPTER':
      return { ...state, chapters: [...state.chapters, action.chapter] };

    case 'UPDATE_CHAPTER':
      return { ...state, chapters: state.chapters.map((c) => (c.id === action.chapter.id ? action.chapter : c)) };

    case 'DELETE_CHAPTER': {
      const topicIds = new Set(state.topics.filter((t) => t.chapterId === action.id).map((t) => t.id));
      return {
        ...state,
        chapters: state.chapters.filter((c) => c.id !== action.id),
        topics: state.topics.filter((t) => !topicIds.has(t.id)),
        reviews: state.reviews.filter((r) => !topicIds.has(r.topicId)),
        tasks: state.tasks.filter((t) => !t.topicId || !topicIds.has(t.topicId)),
        tests: state.tests.filter((t) => !t.topicId || !topicIds.has(t.topicId)),
        mistakes: state.mistakes.filter((m) => !m.topicId || !topicIds.has(m.topicId)),
        sessions: state.sessions.filter((s) => !s.topicId || !topicIds.has(s.topicId)),
      };
    }

    case 'MOVE_CHAPTER': {
      const siblings = state.chapters.filter((c) => c.subjectId === state.chapters.find((x) => x.id === action.id)?.subjectId).sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((c) => c.id === action.id);
      const swap = idx + action.dir;
      if (idx < 0 || swap < 0 || swap >= siblings.length) return state;
      [siblings[idx], siblings[swap]] = [siblings[swap], siblings[idx]];
      const orderMap = new Map(siblings.map((c, i) => [c.id, i + 1]));
      return { ...state, chapters: state.chapters.map((c) => (orderMap.has(c.id) ? { ...c, order: orderMap.get(c.id)! } : c)) };
    }

    case 'ADD_TOPIC':
      return { ...state, topics: [...state.topics, action.topic] };

    case 'UPDATE_TOPIC':
      return { ...state, topics: updateTopic(state.topics, action.topic.id, () => action.topic) };

    case 'DELETE_TOPIC': {
      return {
        ...state,
        topics: state.topics.filter((t) => t.id !== action.id),
        reviews: state.reviews.filter((r) => r.topicId !== action.id),
        tasks: state.tasks.filter((t) => t.topicId !== action.id),
        tests: state.tests.filter((t) => t.topicId !== action.id),
        mistakes: state.mistakes.filter((m) => m.topicId !== action.id),
        sessions: state.sessions.filter((s) => s.topicId !== action.id),
      };
    }

    case 'SET_STUDY_STATUS': {
      let topics = updateTopic(state.topics, action.topicId, (t) => ({
        ...t,
        studyStatus: action.status,
        lastStudyDate: ['in_progress', 'initial_done'].includes(action.status) ? action.date : t.lastStudyDate,
        mastery: action.status === 'mastered' ? Math.max(t.mastery, state.settings.masteredThreshold) : t.mastery,
      }));
      // اتمام مطالعه اولیه → برنامه مرور خودکار (پیشنهاد پیش‌فرض)
      if (action.status === 'initial_done') {
        const topic = state.topics.find((t) => t.id === action.topicId);
        if (topic && !state.reviews.some((r) => r.topicId === action.topicId)) {
          topics = topics; // no-op type guard
          const sched = createInitialSchedule(action.topicId, action.date, state.settings.reviewIntervals);
          return { ...state, topics, reviews: [...state.reviews, ...sched] };
        }
      }
      return { ...state, topics };
    }

    case 'SET_MASTERY':
      return { ...state, topics: updateTopic(state.topics, action.topicId, (t) => ({ ...t, mastery: Math.max(0, Math.min(100, action.mastery)) })) };

    case 'LOG_SESSION': {
      const sessions = [...state.sessions, action.session].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
      let topics = state.topics;
      if (action.session.topicId) {
        topics = updateTopic(topics, action.session.topicId, (t) => ({
          ...t,
          lastStudyDate: action.session.date > (t.lastStudyDate ?? '') ? action.session.date : t.lastStudyDate,
          studyStatus: t.studyStatus === 'not_started' ? 'in_progress' : t.studyStatus,
        }));
      }
      return { ...state, sessions, topics };
    }

    case 'ADD_REVIEW':
      return { ...state, reviews: [...state.reviews, action.review] };

    case 'COMPLETE_REVIEW': {
      const entry = state.reviews.find((r) => r.id === action.id);
      if (!entry) return state;
      const updated: ReviewEntry = {
        ...entry,
        status: 'done',
        doneDate: action.doneDate,
        result: action.result,
        mastery: action.mastery,
        durationMinutes: action.durationMinutes,
        needsReviewAgain: action.needsReviewAgain,
        errorNotes: action.errorNotes,
      };
      let reviews = state.reviews.map((r) => (r.id === action.id ? updated : r));
      let nextDate: string | null = null;
      // اگر نتیجه خوب/متوسط باشد و نیاز به مرور مجدد نباشد → برنامه مرور بعدی
      if (!action.needsReviewAgain) {
        const nextNumber = nextReviewNumber(action.result, entry.reviewNumber);
        nextDate = nextScheduledDate(action.doneDate, action.result, nextNumber, state.settings.reviewIntervals);
        const nextEntry: ReviewEntry = {
          id: uid(),
          topicId: entry.topicId,
          reviewNumber: nextNumber,
          scheduledDate: nextDate,
          doneDate: null,
          result: null,
          mastery: null,
          durationMinutes: null,
          needsReviewAgain: false,
          errorNotes: '',
          status: 'pending',
        };
        reviews = [...reviews, nextEntry];
      }
      const topics = updateTopic(state.topics, entry.topicId, (t) => ({
        ...t,
        lastReviewDate: action.doneDate,
        nextReviewDate: nextDate,
        mastery: action.mastery,
        studyStatus: action.mastery >= state.settings.masteredThreshold && t.studyStatus !== 'mastered' ? 'mastered' : t.studyStatus,
      }));
      return { ...state, reviews, topics };
    }

    case 'SKIP_REVIEW':
      return { ...state, reviews: state.reviews.map((r) => (r.id === action.id ? { ...r, status: 'skipped' as const } : r)) };

    case 'RESCHEDULE_REVIEW':
      return { ...state, reviews: state.reviews.map((r) => (r.id === action.id ? { ...r, scheduledDate: action.newDate } : r)) };

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task] };

    case 'UPDATE_TASK':
      return { ...state, tasks: updateTask(state.tasks, action.task.id, () => action.task) };

    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: updateTask(state.tasks, action.id, (t) => ({
          ...t, done: !t.done, completedAt: !t.done ? action.today : null,
          spentMinutes: !t.done && t.spentMinutes === 0 ? 0 : t.spentMinutes,
        })),
      };

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    case 'ADD_TEST': {
      const test = action.test;
      const topics = test.topicId
        ? updateTopic(state.topics, test.topicId, (t) => ({
            ...t,
            correctCount: t.correctCount + test.correct,
            wrongCount: t.wrongCount + test.wrong,
            unansweredCount: t.unansweredCount + test.unanswered,
          }))
        : state.topics;
      return { ...state, tests: [...state.tests, test], topics };
    }

    case 'DELETE_TEST': {
      const test = state.tests.find((t) => t.id === action.id);
      if (!test) return state;
      const topics = test.topicId
        ? updateTopic(state.topics, test.topicId, (t) => ({
            ...t,
            correctCount: Math.max(0, t.correctCount - test.correct),
            wrongCount: Math.max(0, t.wrongCount - test.wrong),
            unansweredCount: Math.max(0, t.unansweredCount - test.unanswered),
          }))
        : state.topics;
      return { ...state, tests: state.tests.filter((t) => t.id !== action.id), topics };
    }

    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };

    case 'ADD_MISTAKE':
      return { ...state, mistakes: [...state.mistakes, action.mistake] };

    case 'UPDATE_MISTAKE':
      return { ...state, mistakes: state.mistakes.map((m) => (m.id === action.mistake.id ? action.mistake : m)) };

    case 'DELETE_MISTAKE':
      return { ...state, mistakes: state.mistakes.filter((m) => m.id !== action.id) };

    case 'TOGGLE_REST_DAY': {
      const exists = state.restDays.some((r) => r.date === action.date);
      return {
        ...state,
        restDays: exists
          ? state.restDays.filter((r) => r.date !== action.date)
          : [...state.restDays, { date: action.date, note: '' }],
      };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'IMPORT_STATE':
      return action.state;

    case 'SEED_DEMO':
      return buildDemoState(state);

    case 'RESET':
      return { ...EMPTY_STATE, settings: { ...DEFAULT_SETTINGS, appName: state.settings.appName } };

    default:
      return state;
  }
}

/* ---------------- Context ---------------- */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface StoreCtx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  ready: boolean;
  saveStatus: SaveStatus;
  backend: 'idb' | 'local' | 'none';
  today: string;
  timer: TimerState | null;
  timerStart: (subjectId: ID | null, topicId: ID | null, note: string) => void;
  timerPause: () => void;
  timerResume: () => void;
  timerFinish: () => Promise<number | null>; // برگرداندن دقیقه‌های ثبت‌شده
  timerReset: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [backend, setBackend] = useState<'idb' | 'local' | 'none'>('idb');
  const [today, setToday] = useState(todayISO());
  const [timer, setTimer] = useState<TimerState | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  // بارگذاری اولیه
  useEffect(() => {
    (async () => {
      const [saved, be] = await Promise.all([loadState(), storageBackend()]);
      setBackend(be);
      if (saved && typeof saved === 'object' && saved.version) {
        dispatch({ type: 'HYDRATE', state: { ...EMPTY_STATE, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } } });
      }
      const tmr = await loadTimer<TimerState>();
      if (tmr && tmr.running) setTimer(tmr);
      hydratedRef.current = true;
      setReady(true);
    })();
  }, []);

  // ذخیره خودکار (debounce)
  useEffect(() => {
    if (!hydratedRef.current) return;
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveState(state);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 350);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state]);

  // تایمر: ذخیره در IndexedDB (مقاوم در برابر رفرش)
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveTimer(timer).catch(() => {});
  }, [timer]);

  // به‌روزرسانی «امروز» هر ۳۰ ثانیه
  useEffect(() => {
    const iv = setInterval(() => setToday(todayISO()), 30000);
    return () => clearInterval(iv);
  }, []);

  // اعمال تم
  useEffect(() => {
    const theme = state.settings.theme;
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    const onSys = (e: MediaQueryListEvent) => {
      if (state.settings.theme === 'system') document.documentElement.classList.toggle('dark', e.matches);
    };
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener('change', onSys);
    return () => mq?.removeEventListener('change', onSys);
  }, [state.settings.theme]);

  const timerStart = useCallback((subjectId: ID | null, topicId: ID | null, note: string) => {
    setTimer({ subjectId, topicId, startedAt: Date.now(), accumulatedMs: 0, running: true, note });
  }, []);

  const timerPause = useCallback(() => {
    setTimer((t) => t && t.running
      ? { ...t, accumulatedMs: t.accumulatedMs + (Date.now() - t.startedAt), running: false }
      : t);
  }, []);

  const timerResume = useCallback(() => {
    setTimer((t) => (t && !t.running ? { ...t, startedAt: Date.now(), running: true } : t));
  }, []);

  const timerRef = useRef<TimerState | null>(null);
  useEffect(() => { timerRef.current = timer; }, [timer]);

  const timerFinish = useCallback(async (): Promise<number | null> => {
    const t = timerRef.current;
    if (!t) return null;
    // محاسبه از زمان واقعی رویداد — نه شمارنده حافظه صفحه
    const ms = t.accumulatedMs + (t.running ? Date.now() - t.startedAt : 0);
    const minutes = Math.max(1, Math.round(ms / 60000));
    await clearTimer();
    setTimer(null);
    return minutes > 0 ? minutes : null;
  }, []);

  const timerReset = useCallback(() => {
    setTimer(null);
    clearTimer().catch(() => {});
  }, []);

  const value = useMemo<StoreCtx>(() => ({
    state, dispatch, ready, saveStatus, backend, today, timer,
    timerStart, timerPause, timerResume, timerFinish, timerReset,
  }), [state, ready, saveStatus, backend, today, timer, timerStart, timerPause, timerResume, timerFinish, timerReset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore باید درون StoreProvider باشد');
  return ctx;
}

/* ---------------- سازنده‌های اقدام ---------------- */
export function newSubject(name: string, color: string, order: number): Subject {
  return { id: uid(), name: name.trim(), color, order, createdAt: new Date().toISOString() };
}
export function newChapter(subjectId: ID, name: string, order: number): Chapter {
  return { id: uid(), subjectId, name: name.trim(), order };
}
export function newTopic(subjectId: ID, chapterId: ID, name: string, priority: Topic['priority'], difficulty: Topic['difficulty']): Topic {
  return {
    id: uid(), subjectId, chapterId, name: name.trim(),
    pages: null, startPage: null, endPage: null,
    priority, difficulty,
    studyStatus: 'not_started', mastery: 0,
    correctCount: 0, wrongCount: 0, unansweredCount: 0,
    lastStudyDate: null, lastReviewDate: null, nextReviewDate: null,
    notes: '', resources: '', createdAt: new Date().toISOString(),
  };
}
export function newTask(
  date: string, title: string, type: Task['type'],
  subjectId: ID | null, topicId: ID | null,
  targetPages: number | null = null, targetTests: number | null = null,
): Task {
  return {
    id: uid(), date, title: title.trim(), type, subjectId, topicId,
    targetPages, targetTests,
    done: false, spentMinutes: 0,
    note: '', postponeReason: null, createdAt: new Date().toISOString(), completedAt: null,
  };
}
export function newTest(p: Omit<TestSession, 'id' | 'createdAt'>): TestSession {
  return { ...p, id: uid(), createdAt: new Date().toISOString() };
}
export function newMistake(p: Omit<Mistake, 'id' | 'createdAt'>): Mistake {
  return { ...p, id: uid(), createdAt: new Date().toISOString() };
}
export function newSession(p: Omit<StudySession, 'id'>): StudySession {
  return { ...p, id: uid() };
}

/** ثبت اتمام مطالعه اولیه یک مبحث (با برنامه مرور) */
export function completeInitialStudy(
  dispatch: React.Dispatch<Action>,
  topicId: ID,
  date: string,
): void {
  dispatch({ type: 'SET_STUDY_STATUS', topicId, status: 'initial_done', date });
}

/** ثبت مرور و برنامه‌ریزی مرور بعدی */
export function completeReview(
  state: AppState,
  dispatch: React.Dispatch<Action>,
  reviewId: ID,
  payload: { result: ReviewResult; mastery: number; durationMinutes: number; needsReviewAgain: boolean; errorNotes: string },
): void {
  dispatch({ type: 'COMPLETE_REVIEW', id: reviewId, doneDate: todayISO(), ...payload });
}

export { addDaysISO };
