/* ============ خروجی و ورودی نسخه پشتیبان JSON با اعتبارسنجی ============ */
import type { AppState } from '../types';

export const CURRENT_VERSION = 1;

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: AppState;
}

export interface BackupSummary {
  app: string;
  version: number;
  exportedAt: string;
  subjects: number;
  chapters: number;
  topics: number;
  reviews: number;
  tasks: number;
  tests: number;
  mistakes: number;
  sessions: number;
  restDays: number;
}

export type BackupCheck = { ok: true; summary: BackupSummary } | { ok: false; error: string };

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isArrayOf(x: unknown, pred: (v: unknown) => boolean): x is unknown[] {
  return Array.isArray(x) && x.every(pred);
}

function hasStr(o: Record<string, unknown>, key: string): boolean {
  return typeof o[key] === 'string';
}

function isID(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

/** اعتبارسنجی ساختار فایل پشتیبان — بدون اعتماد به محتوای دلخواه */
export function validateBackup(raw: unknown): BackupCheck {
  if (!isObj(raw)) return { ok: false, error: 'فرمت فایل نامعتبر است.' };
  const { app, version, exportedAt, data } = raw;
  if (app !== 'medstudy-os') return { ok: false, error: 'این فایل متعلق به MEDSTUDY OS نیست.' };
  if (typeof version !== 'number') return { ok: false, error: 'نسخه فایل پشتیبان نامعتبر است.' };
  if (version > CURRENT_VERSION)
    return { ok: false, error: `نسخه فایل (${version}) از نسخه برنامه (${CURRENT_VERSION}) جدیدتر است. ابتدا برنامه را به‌روز کنید.` };
  if (!hasStr(raw, 'exportedAt')) return { ok: false, error: 'تاریخ خروجی فایل نامعتبر است.' };
  if (!isObj(data)) return { ok: false, error: 'بخش داده فایل پشتیبان آسیب‌دیده است.' };

  const d = data;
  const arrays = ['subjects', 'chapters', 'topics', 'reviews', 'tasks', 'tests', 'mistakes', 'sessions', 'restDays'] as const;
  for (const key of arrays) {
    if (!Array.isArray(d[key])) return { ok: false, error: `فهرست ${key} در فایل پشتیبان یافت نشد.` };
  }
  // بررسی شناسه‌های منحصربه‌فرد در هر مورد
  if (!isArrayOf(d.subjects, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار دروس نامعتبر است.' };
  if (!isArrayOf(d.chapters, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار فصل‌ها نامعتبر است.' };
  if (!isArrayOf(d.topics, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار مباحث نامعتبر است.' };
  if (!isArrayOf(d.reviews, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار مرورها نامعتبر است.' };
  if (!isArrayOf(d.tasks, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار وظایف نامعتبر است.' };
  if (!isArrayOf(d.tests, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار تست‌ها نامعتبر است.' };
  if (!isArrayOf(d.mistakes, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار اشتباهات نامعتبر است.' };
  if (!isArrayOf(d.sessions, (v) => isObj(v) && isID((v as Record<string, unknown>).id)))
    return { ok: false, error: 'ساختار جلسات نامعتبر است.' };
  if (!isObj(d.settings)) return { ok: false, error: 'تنظیمات در فایل پشتیبان نامعتبر است.' };

  return {
    ok: true,
    summary: {
      app,
      version,
      exportedAt: String(exportedAt),
      subjects: (d.subjects as unknown[]).length,
      chapters: (d.chapters as unknown[]).length,
      topics: (d.topics as unknown[]).length,
      reviews: (d.reviews as unknown[]).length,
      tasks: (d.tasks as unknown[]).length,
      tests: (d.tests as unknown[]).length,
      mistakes: (d.mistakes as unknown[]).length,
      sessions: (d.sessions as unknown[]).length,
      restDays: (d.restDays as unknown[]).length,
    },
  };
}

/** ساخت فایل پشتیبان از وضعیت فعلی */
export function buildBackup(state: AppState): string {
  const payload: BackupFile = {
    app: 'medstudy-os',
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(payload, null, 2);
}

/** گرفتن خلاصه قابل نمایش از فایل پشتیبان */
export function summarizeBackup(file: BackupFile): BackupSummary {
  return {
    app: file.app,
    version: file.version,
    exportedAt: file.exportedAt,
    subjects: file.data.subjects.length,
    chapters: file.data.chapters.length,
    topics: file.data.topics.length,
    reviews: file.data.reviews.length,
    tasks: file.data.tasks.length,
    tests: file.data.tests.length,
    mistakes: file.data.mistakes.length,
    sessions: file.data.sessions.length,
    restDays: file.data.restDays.length,
  };
}

/** دانلود فایل در مرورگر */
export function downloadJSON(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
