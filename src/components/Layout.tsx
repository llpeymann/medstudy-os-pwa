/* ============ چارچوب اصلی — سایدبار، هدر، ناوبری موبایل ============ */
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, CalendarCheck, BookOpen, Brain, CalendarDays, FlaskConical,
  NotebookPen, Timer, BarChart3, Settings as SettingsIcon, Sun, Moon, Monitor,
  Menu, X, Download, Upload, Bell, GraduationCap, Save, CloudOff, CloudAlert,
  CheckCircle2, ChevronLeft, Hourglass,
} from 'lucide-react';
import { useStore } from '../state/store';
import { daysUntil, formatDate } from '../lib/dates';
import { faNum } from '../lib/format';
import { reviewBuckets } from '../lib/reviews';
import { useToast } from './ui';

export type Route =
  | 'dashboard' | 'today' | 'subjects' | 'reviews' | 'calendar'
  | 'tests' | 'mistakes' | 'sessions' | 'reports' | 'settings';

const NAV: { key: Route; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'داشبورد', icon: <LayoutDashboard size={18} /> },
  { key: 'today', label: 'برنامه امروز', icon: <CalendarCheck size={18} /> },
  { key: 'subjects', label: 'دروس و مباحث', icon: <BookOpen size={18} /> },
  { key: 'reviews', label: 'مرورهای هوشمند', icon: <Brain size={18} /> },
  { key: 'calendar', label: 'تقویم', icon: <CalendarDays size={18} /> },
  { key: 'tests', label: 'تست‌ها و آمار', icon: <FlaskConical size={18} /> },
  { key: 'mistakes', label: 'دفترچه اشتباهات', icon: <NotebookPen size={18} /> },
  { key: 'sessions', label: 'جلسات مطالعه', icon: <Timer size={18} /> },
  { key: 'reports', label: 'گزارش پیشرفت', icon: <BarChart3 size={18} /> },
  { key: 'settings', label: 'تنظیمات و پشتیبان‌گیری', icon: <SettingsIcon size={18} /> },
];

export const ROUTE_TITLES: Record<Route, string> = {
  dashboard: 'داشبورد',
  today: 'برنامه امروز',
  subjects: 'دروس و مباحث',
  reviews: 'مرورهای هوشمند',
  calendar: 'تقویم مطالعاتی',
  tests: 'تست‌ها و آمار',
  mistakes: 'دفترچه اشتباهات',
  sessions: 'جلسات مطالعه',
  reports: 'گزارش پیشرفت',
  settings: 'تنظیمات و پشتیبان‌گیری',
};

function ThemeButton() {
  const { state, dispatch } = useStore();
  const cycle = () => {
    const next = state.settings.theme === 'light' ? 'dark' : state.settings.theme === 'dark' ? 'system' : 'light';
    dispatch({ type: 'UPDATE_SETTINGS', settings: { theme: next } });
  };
  const icon = state.settings.theme === 'dark'
    ? <Moon size={17} />
    : state.settings.theme === 'light' ? <Sun size={17} /> : <Monitor size={17} />;
  const label = state.settings.theme === 'dark' ? 'تم شب' : state.settings.theme === 'light' ? 'تم روز' : 'تم سیستم';
  return (
    <button onClick={cycle} title={`تم فعلی: ${label} — برای تغییر کلیک کنید`} className="theme-btn">
      {icon}
    </button>
  );
}

function SaveIndicator() {
  const { saveStatus, backend } = useStore();
  const map = {
    saving: { icon: <Save size={13} className="animate-pulse" />, text: 'در حال ذخیره…', cls: 'text-muted' },
    saved: { icon: <CheckCircle2 size={13} />, text: 'ذخیره شد', cls: 'text-emerald' },
    error: { icon: <CloudAlert size={13} />, text: 'خطای ذخیره‌سازی', cls: 'text-rose' },
    idle: { icon: <CloudOff size={13} />, text: 'آماده', cls: 'text-muted' },
  } as const;
  const s = map[saveStatus];
  return (
    <span className={`flex items-center gap-1 text-[11px] font-semibold ${s.cls}`} title={`محرک ذخیره‌سازی: ${backend === 'idb' ? 'IndexedDB' : 'حافظه محلی'}`}>
      {s.icon}
      <span className="hidden sm:inline">{s.text}</span>
    </span>
  );
}

function BackupButtons() {
  const { state } = useStore();
  const toast = useToast();
  const exportNow = () => {
    const blob = new Blob([JSON.stringify({ app: 'medstudy-os', version: state.version, exportedAt: new Date().toISOString(), data: state }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medstudy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.push('نسخه پشتیبان دانلود شد', 'info');
  };
  return (
    <>
      <button onClick={exportNow} title="تهیه نسخه پشتیبان JSON" className="icon-btn"><Download size={16} /></button>
    </>
  );
}

function NotificationBell() {
  const { state, today } = useStore();
  const [open, setOpen] = useState(false);
  const buckets = useMemo(() => reviewBuckets(state, today), [state, today]);
  const overdueCount = buckets.overdue.length;
  const dueCount = buckets.dueToday.length;
  const openTasks = state.tasks.filter((t) => !t.done && t.date < today).length;
  const examIn = daysUntil(state.settings.examDate);
  const total = overdueCount + dueCount;
  return (
    <div className="relative">
      <button className="icon-btn relative" title="اعلان‌ها" onClick={() => setOpen((o) => !o)}>
        <Bell size={17} />
        {total > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center pulse-dot">
            {faNum(total)}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-10 z-[61] card w-72 p-3 space-y-2 text-sm modal-sheet">
            <div className="font-bold text-xs text-muted px-1">اعلان‌های درون‌برنامه</div>
            {examIn !== null && examIn >= 0 && (
              <div className="note-row"><Hourglass size={14} className="text-brand shrink-0" /><span>{faNum(examIn)} روز تا آزمون مانده است</span></div>
            )}
            {overdueCount > 0 && <div className="note-row"><span className="dot bg-rose" /><span>{faNum(overdueCount)} مرور عقب‌افتاده دارید</span></div>}
            {dueCount > 0 && <div className="note-row"><span className="dot bg-violet" /><span>{faNum(dueCount)} مرور امروز موعد دارد</span></div>}
            {openTasks > 0 && <div className="note-row"><span className="dot bg-amber" /><span>{faNum(openTasks)} وظیفه انجام‌نشده عقب افتاده است</span></div>}
            {total === 0 && openTasks === 0 && (
              <div className="text-muted text-xs px-1 py-2">هیچ اعلانی در انتظار نیست. حال شما خوب است!</div>
            )}
            <div className="text-[10px] text-muted border-t border-border pt-2">
              اعلان‌های مرورگری در نسخه آفلاین محدود است؛ اعلان‌ها درون برنامه نمایش داده می‌شوند.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout({ route, navigate, children }: {
  route: Route; navigate: (r: Route) => void; children: React.ReactNode;
}) {
  const { state, today, ready } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const examIn = daysUntil(state.settings.examDate);
  const activeIdx = NAV.findIndex((n) => n.key === route);

  // هر تغییر مسیر (از منوی کشویی، ناوبری پایین یا hash) باید منوی موبایل را ببندد.
  useEffect(() => {
    setMobileOpen(false);
  }, [route]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  const countdownChip = useMemo(() => {
    if (examIn === null) return { text: 'تاریخ آزمون ثبت نشده', tone: 'gray' as const };
    if (examIn < 0) return { text: 'آزمون برگزار شده', tone: 'rose' as const };
    if (examIn === 0) return { text: 'امروز آزمون است!', tone: 'rose' as const };
    return { text: `${faNum(examIn)} روز مانده`, tone: examIn <= 14 ? 'rose' : examIn <= 45 ? 'amber' : 'teal' as const };
  }, [examIn]);

  return (
    <div className="app-shell">
      {/* سایدبار دسکتاپ (راست‌چین) */}
      <aside className="sidebar hidden flex-col lg:flex">
        <div className="px-4 pt-5 pb-4 flex items-center gap-2.5">
          <div className="logo-badge"><GraduationCap size={20} /></div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm leading-5 truncate">{state.settings.appName}</div>
            <div className="text-[10px] text-muted">سیستم مدیریت مطالعه پزشکی</div>
          </div>
        </div>
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => navigate(n.key)}
              className={`nav-item ${route === n.key ? 'active' : ''}`}
            >
              {n.icon}
              <span className="flex-1 text-start">{n.label}</span>
              {n.key === 'reviews' && (reviewBuckets(state, today).dueToday.length + reviewBuckets(state, today).overdue.length) > 0 && (
                <span className="nav-badge">{faNum(reviewBuckets(state, today).dueToday.length + reviewBuckets(state, today).overdue.length)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-[10px] text-muted leading-4">
            داده‌ها فقط روی این دستگاه ذخیره می‌شوند.<br />نسخه پشتیبان منظم بگیرید.
          </div>
        </div>
      </aside>

      {/* بدنه */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* هدر */}
        <header className="app-header">
          <button
            className="icon-btn mobile-menu-toggle lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'بستن منو' : 'باز کردن منو'}
            title={mobileOpen ? 'بستن منو' : 'باز کردن منو'}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-sm sm:text-base truncate">{ROUTE_TITLES[route]}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={`pill tone-${countdownChip.tone} hidden xs:inline-flex`} title="شمارش معکوس آزمون">
              <ChevronLeft size={12} className="rotate-90" />
              {countdownChip.text}
            </span>
            <span className="pill tone-gray hidden md:inline-flex">{formatDate(today, state.settings.calendar, true)}</span>
            <SaveIndicator />
            <NotificationBell />
            <BackupButtons />
            <ThemeButton />
          </div>
        </header>

        {/* محتوا */}
        <main className="flex-1 overflow-y-auto page-scroll">
          {!ready ? (
            <div className="flex items-center justify-center h-full text-muted text-sm">در حال آماده‌سازی…</div>
          ) : children}
        </main>

        {/* ناوبری پایین موبایل */}
        <nav className="mobile-nav lg:hidden">
          {(['dashboard', 'today', 'reviews', 'calendar', 'settings'] as Route[]).map((key) => {
            const item = NAV.find((n) => n.key === key)!;
            return (
              <button
                key={key}
                className={`mobile-nav-item ${route === key ? 'active' : ''}`}
                onClick={() => navigate(key)}
              >
                {item.icon}
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* کشوی موبایل */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="mobile-drawer-layer lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="منوی اصلی"
        >
          <div className="mobile-menu-backdrop absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-surface border-s border-border flex flex-col sheet-panel">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="logo-badge"><GraduationCap size={18} /></div>
                <span className="font-extrabold text-sm">{state.settings.appName}</span>
              </div>
              <button className="icon-btn" onClick={() => setMobileOpen(false)} title="بستن"><X size={18} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
              {NAV.map((n) => (
                <button
                  key={n.key}
                  onClick={() => { navigate(n.key); setMobileOpen(false); }}
                  className={`nav-item ${route === n.key ? 'active' : ''}`}
                >
                  {n.icon}
                  <span className="flex-1 text-start">{n.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
