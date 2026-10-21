/* ---------- نقشه‌های سریع نام‌ها ---------- */
import { useMemo } from 'react';
import type { AppState } from '../types';

export interface Lookups {
  subjectById: Map<string, AppState['subjects'][number]>;
  chapterById: Map<string, AppState['chapters'][number]>;
  topicById: Map<string, AppState['topics'][number]>;
}

export function useLookups(state: AppState): Lookups {
  return useMemo(() => ({
    subjectById: new Map(state.subjects.map((s) => [s.id, s])),
    chapterById: new Map(state.chapters.map((c) => [c.id, c])),
    topicById: new Map(state.topics.map((t) => [t.id, t])),
  }), [state]);
}

export function topicTitle(lookups: Lookups, topicId: string | null | undefined): string {
  if (!topicId) return 'بدون مبحث';
  return lookups.topicById.get(topicId)?.name ?? 'مبحث حذف‌شده';
}

export function subjectColor(lookups: Lookups, subjectId: string | null | undefined): string {
  if (!subjectId) return 'var(--brand)';
  return lookups.subjectById.get(subjectId)?.color ?? 'var(--brand)';
}
