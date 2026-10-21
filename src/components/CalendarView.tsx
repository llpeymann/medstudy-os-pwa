/* ============ تقویم ماهانه — شمسی/میلادی ============ */
import React from 'react';
import { ChevronLeft, ChevronRight, MoonStar, CalendarDays, Brain, FlaskConical, ListTodo, BookOpen, Clock } from 'lucide-react';
import { monthDays, monthLabel, todayISO, formatDate } from '../lib/dates';
import { toJalaali } from '../lib/jalaali';
import { faNum } from '../lib/format';
import type { CalendarMode } from '../types';

export interface DayItem {
  study: number;
  tasks: number;
  reviews: number;
  tests: number;
  rest: boolean;
  overdue: number;
  isExam?: boolean;
}

export default function CalendarView({ year, month, calendar, items, selected, onSelect, onPrev, onNext, examDate }: {
  year: number;
  month: number; // 1-based
  calendar: CalendarMode;
  items: Record<string, DayItem>;
  selected: string | null;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
  examDate: string | null;
}) {
  const today = todayISO();
  const days = monthDays(year, month, calendar);
  // روزهای خالی ابتدای ماه (شروع هفته: شنبه)
  const firstDow = new Date(days[0].iso + 'T12:00:00').getDay();
  const cells: ({ iso: string; day: number; inMonth: boolean } | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...days.map((d) => ({ iso: d.iso, day: d.day, inMonth: true })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const WEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <button className="icon-btn" onClick={onNext} title="ماه بعد"><ChevronRight size={17} /></button>
        <div className="font-extrabold">{monthLabel(year, month, calendar)}</div>
        <button className="icon-btn" onClick={onPrev} title="ماه قبل"><ChevronLeft size={17} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK.map((w) => (
          <div key={w} className="text-center text-[10px] font-bold text-muted py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="cal-cell empty" />;
          const it = items[c.iso];
          const isToday = c.iso === today;
          const isSel = c.iso === selected;
          const isExam = examDate === c.iso;
          return (
            <button
              key={c.iso}
              onClick={() => onSelect(c.iso)}
              className={`cal-cell ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''} ${it?.rest ? 'rest' : ''}`}
              title={formatDate(c.iso, calendar, true)}
            >
              <span className="cal-day">{faNum(c.day)}</span>
              {isExam && <span className="text-[8px] font-bold text-rose leading-none">آزمون</span>}
              <span className="cal-dots">
                {it && it.study > 0 && <i className="dot bg-sky" title="مطالعه" />}
                {it && it.tasks > 0 && <i className="dot bg-amber" title="وظیفه" />}
                {it && it.reviews > 0 && <i className="dot bg-violet" title="مرور" />}
                {it && it.tests > 0 && <i className="dot bg-emerald" title="تست" />}
                {it && it.overdue > 0 && <i className="dot bg-rose" title="عقب‌افتاده" />}
                {it?.rest && <MoonStar size={8} className="text-muted" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border text-[10px] text-muted">
        <span className="flex items-center gap-1"><i className="dot bg-sky" /> مطالعه</span>
        <span className="flex items-center gap-1"><i className="dot bg-amber" /> وظیفه</span>
        <span className="flex items-center gap-1"><i className="dot bg-violet" /> مرور</span>
        <span className="flex items-center gap-1"><i className="dot bg-emerald" /> تست</span>
        <span className="flex items-center gap-1"><i className="dot bg-rose" /> عقب‌افتاده</span>
        <span className="flex items-center gap-1"><MoonStar size={10} /> استراحت</span>
      </div>
    </div>
  );
}

export function dayItemsSummary(items: DayItem | undefined): string {
  if (!items) return '';
  const parts: string[] = [];
  if (items.study) parts.push(`${faNum(items.study)} جلسه مطالعه`);
  if (items.tasks) parts.push(`${faNum(items.tasks)} وظیفه`);
  if (items.reviews) parts.push(`${faNum(items.reviews)} مرور`);
  if (items.tests) parts.push(`${faNum(items.tests)} تست`);
  return parts.join(' · ');
}

export function DayDetail({ iso, items, calendar, onAddTask }: {
  iso: string; items: DayItem | undefined; calendar: CalendarMode; onAddTask?: () => void;
}) {
  const iconFor = {
    study: <BookOpen size={13} className="text-sky" />,
    tasks: <ListTodo size={13} className="text-amber" />,
    reviews: <Brain size={13} className="text-violet" />,
    tests: <FlaskConical size={13} className="text-emerald" />,
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-extrabold flex items-center gap-2">
          <CalendarDays size={16} className="text-brand" />
          {formatDate(iso, calendar, true)}
        </div>
      </div>
      {!items || (items.study + items.tasks + items.reviews + items.tests === 0 && !items.rest) ? (
        <div className="empty-state !py-6">
          <Clock size={26} />
          <div className="empty-title">برای این روز برنامه‌ای ثبت نشده</div>
          <div className="empty-message">می‌توانید وظیفه یا مروری برای این روز اضافه کنید.</div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          {items.rest && <div className="note-row"><MoonStar size={14} className="text-muted" /> روز استراحت</div>}
          {items.study > 0 && <div className="note-row">{iconFor.study}<span>{faNum(items.study)} جلسه مطالعه ثبت‌شده</span></div>}
          {items.tasks > 0 && <div className="note-row">{iconFor.tasks}<span>{faNum(items.tasks)} وظیفه برنامه‌ریزی‌شده</span></div>}
          {items.reviews > 0 && <div className="note-row">{iconFor.reviews}<span>{faNum(items.reviews)} مرور موعدرسیده</span></div>}
          {items.tests > 0 && <div className="note-row">{iconFor.tests}<span>{faNum(items.tests)} جلسه تست</span></div>}
          {items.overdue > 0 && <div className="note-row"><span className="dot bg-rose" /><span>{faNum(items.overdue)} مورد عقب‌افتاده</span></div>}
        </div>
      )}
      {onAddTask && (
        <div className="mt-3 pt-3 border-t border-border">
          <button className="btn btn-soft btn-xs w-full" onClick={onAddTask}>+ افزودن وظیفه برای این روز</button>
        </div>
      )}
    </div>
  );
}

export function jalaliTodayParts() {
  const t = todayISO();
  const [y, m, d] = t.split('-').map(Number);
  const j = toJalaali(y, m, d);
  return j;
}
