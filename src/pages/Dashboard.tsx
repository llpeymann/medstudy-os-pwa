/* ============ صفحه داشبورد ============ */
import React, { useMemo } from 'react';
import {
  Clock, Brain, Target, ListTodo, AlertTriangle, CalendarCheck,
  FlaskConical, Activity, ArrowLeft, PlayCircle, BookOpen, Sparkles,
  TrendingUp, Hourglass, Plus, GraduationCap,
} from 'lucide-react';
import { useStore } from '../state/store';
import { overallProgress, recentActivity, taskStats, testStats, weeklyActivity, totalStudyMinutes } from '../lib/progress';
import { overdueReviews, reviewBuckets } from '../lib/reviews';
import { daysUntil, formatDate, diffDays, todayISO } from '../lib/dates';
import { faNum, faPct, minutesToText } from '../lib/format';
import { Card, CardHeader, Button, Pill, EmptyState, Donut, useToast } from '../components/ui';
import { BarChart, CountdownRing } from '../components/Charts';
import { useLookups, subjectColor } from '../lib/lookups';
import type { Route } from '../components/Layout';

export default function Dashboard({ navigate }: { navigate: (r: Route) => void }) {
  const { state, today } = useStore();
  const toast = useToast();
  const L = useLookups(state);
  const prog = useMemo(() => overallProgress(state), [state]);
  const stats = useMemo(() => taskStats(state.tasks, today), [state.tasks, today]);
  const tests = useMemo(() => testStats(state.tests), [state.tests]);
  const week = useMemo(() => weeklyActivity(state), [state]);
  const overdue = useMemo(() => overdueReviews(state, today), [state, today]);
  const buckets = useMemo(() => reviewBuckets(state, today), [state, today]);
  const activity = useMemo(() => recentActivity(state), [state]);
  const examIn = daysUntil(state.settings.examDate);
  const totalDays = state.settings.examDate ? diffDays(today, state.settings.examDate) : 0;
  const minutesToday = state.sessions.filter((s) => s.date === today).reduce((a, s) => a + s.durationMinutes, 0);
  const overdueTasks = state.tasks.filter((t) => !t.done && t.date < today);

  if (state.subjects.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto fade-up">
        <EmptyState
          icon={<GraduationCap size={40} />}
          title={`به ${state.settings.appName} خوش آمدید`}
          message="هنوز درسی ثبت نشده است. برای شروع، اولین درس خود را اضافه کنید؛ سپس فصل‌ها و مباحث را بسازید. همه چیز روی همین دستگاه ذخیره می‌شود."
          action={<Button onClick={() => navigate('subjects')}>شروع با اضافه‌کردن درس</Button>}
        />
        <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs">
          {[
            { t: '۱. ساختار درس', d: 'درس ← فصل ← مبحث بسازید.' },
            { t: '۲. مطالعه و مرور', d: 'مبحث را مطالعه‌شده علامت بزنید تا مرور خودکار برنامه‌ریزی شود.' },
            { t: '۳. تست و تحلیل', d: 'نتایج تست و اشتباهات را ثبت کنید.' },
          ].map((s) => (
            <div key={s.t} className="card p-4">
              <div className="font-bold mb-1">{s.t}</div>
              <div className="text-muted leading-5">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 fade-up">
      {/* ردیف شمارش معکوس + پیشرفت */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          {examIn !== null ? (
            <>
              <div className="relative w-28 h-28 shrink-0">
                <CountdownRing days={Math.max(0, examIn)} total={Math.max(totalDays, 1)} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-extrabold timer-digit">{faNum(Math.max(0, examIn))}</div>
                  <div className="text-[10px] text-muted font-bold">روز مانده</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted font-bold mb-1">تاریخ آزمون</div>
                <div className="font-extrabold text-sm">{formatDate(state.settings.examDate, state.settings.calendar)}</div>
                {examIn <= 14 && examIn >= 0 && (
                  <Pill tone="rose" className="mt-2">مهلت نزدیک است</Pill>
                )}
                {examIn < 0 && <Pill tone="rose" className="mt-2">آزمون گذشته — تاریخ را به‌روز کنید</Pill>}
                <Button variant="ghost" size="xs" className="mt-2" onClick={() => navigate('settings')}>تغییر تاریخ آزمون</Button>
              </div>
            </>
          ) : (
            <div className="py-2">
              <div className="flex items-center gap-2 text-muted mb-2"><Hourglass size={18} /><span className="font-bold text-sm text-ink">تاریخ آزمون ثبت نشده</span></div>
              <p className="text-xs text-muted leading-5 mb-3">تاریخ آزمون را در تنظیمات وارد کنید تا شمارش معکوس و برنامه‌ریزی فعال شود.</p>
              <Button size="sm" onClick={() => navigate('settings')}>تنظیم تاریخ آزمون</Button>
            </div>
          )}
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <Donut value={prog.studiedPct} size={104} stroke={11}>
            <div className="text-xl font-extrabold timer-digit">{faPct(prog.studiedPct)}</div>
            <div className="text-[9px] text-muted font-bold">مطالعه‌شده</div>
          </Donut>
          <div className="space-y-1.5 text-xs flex-1">
            <div className="flex justify-between"><span className="text-muted">مطالعه اولیه</span><b>{faNum(prog.studied)}/{faNum(prog.totalTopics)}</b></div>
            <div className="flex justify-between"><span className="text-muted">مرور انجام‌شده</span><b>{faNum(prog.reviewed)} مبحث</b></div>
            <div className="flex justify-between"><span className="text-muted">تسلط مناسب</span><b>{faNum(prog.mastered)} مبحث</b></div>
            <div className="flex justify-between"><span className="text-muted">زمان کل مطالعه</span><b>{minutesToText(totalStudyMinutes(state))}</b></div>
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader title="برنامه امروز" subtitle={formatDate(today, state.settings.calendar, true)} action={<Button variant="ghost" size="xs" onClick={() => navigate('today')}>مشاهده</Button>} />
          <div className="px-4 pb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">وظایف انجام‌شده</span>
              <b>{faNum(stats.done)} از {faNum(stats.total)}</b>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted">مرورهای موعدرسیده امروز</span>
              <b className="text-violet">{faNum(buckets.dueToday.length)}</b>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">مرورهای عقب‌افتاده</span>
              <b className={overdue.length ? 'text-rose' : ''}>{faNum(overdue.length)}</b>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* پیشرفت دروس */}
        <Card>
          <CardHeader title="پیشرفت دروس" action={<Button variant="ghost" size="xs" onClick={() => navigate('subjects')}>همه دروس</Button>} />
          <div className="px-4 pb-4 space-y-3">
            {state.subjects.length === 0 && <EmptyState icon={<BookOpen size={26} />} title="هنوز درسی ثبت نشده" />}
            {[...state.subjects].sort((a, b) => a.order - b.order).map((s) => {
              const topics = state.topics.filter((t) => t.subjectId === s.id);
              const studied = topics.filter((t) => ['initial_done', 'needs_review', 'mastered', 'needs_more_tests'].includes(t.studyStatus)).length;
              const pct = topics.length ? Math.round((studied / topics.length) * 100) : 0;
              const mins = state.sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.durationMinutes, 0);
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-bold truncate">{s.name}</span>
                      <span className="text-[11px] text-muted">{faPct(pct)} · {faNum(mins)} دقیقه</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {faNum(studied)} از {faNum(topics.length)} مبحث
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* نمودار هفتگی */}
        <Card>
          <CardHeader title="فعالیت مطالعاتی هفته" subtitle={state.settings.chartsEnabled ? 'دقیقه مطالعه در ۷ روز گذشته' : 'نمودارها در تنظیمات خاموش هستند'} />
          <div className="px-4 pb-4">
            {state.settings.chartsEnabled ? (
              <BarChart data={week.map((w) => ({ label: w.label, value: w.minutes }))} color="var(--brand)" height={150} />
            ) : (
              <EmptyState icon={<Activity size={24} />} title="نمودارها غیرفعال هستند" message="از تنظیمات، نمایش نمودارها را فعال کنید." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* مرورها و عقب‌افتادگی */}
        <Card>
          <CardHeader title="مرور و عقب‌افتادگی" action={<Button variant="ghost" size="xs" onClick={() => navigate('reviews')}>باز کردن</Button>} />
          <div className="px-4 pb-4 space-y-2 text-sm">
            <div className="note-row"><Brain size={14} className="text-violet shrink-0" /><span className="flex-1">مرور امروز</span><b>{faNum(buckets.dueToday.length)}</b></div>
            <div className="note-row"><AlertTriangle size={14} className="text-rose shrink-0" /><span className="flex-1">مرور عقب‌افتاده</span><b>{faNum(buckets.overdue.length)}</b></div>
            <div className="note-row"><CalendarCheck size={14} className="text-brand shrink-0" /><span className="flex-1">انجام‌شده امروز</span><b>{faNum(buckets.doneToday.length)}</b></div>
            <div className="note-row"><ListTodo size={14} className="text-amber shrink-0" /><span className="flex-1">وظایف عقب‌افتاده</span><b>{faNum(overdueTasks.length)}</b></div>
          </div>
        </Card>

        {/* وضعیت تست‌ها */}
        <Card>
          <CardHeader title="وضعیت تست‌ها" action={<Button variant="ghost" size="xs" onClick={() => navigate('tests')}>جزئیات</Button>} />
          <div className="px-4 pb-4 space-y-2">
            {tests.totalSessions === 0 ? (
              <EmptyState icon={<FlaskConical size={24} />} title="هنوز تستی ثبت نشده" message="اولین جلسه تست خود را ثبت کنید تا تحلیل آغاز شود." />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="card !rounded-lg p-2.5 bg-surface-2">
                    <div className="text-lg font-extrabold timer-digit text-emerald">{faNum(tests.correctPct)}٪</div>
                    <div className="text-[10px] text-muted font-bold">صحیح</div>
                  </div>
                  <div className="card !rounded-lg p-2.5 bg-surface-2">
                    <div className="text-lg font-extrabold timer-digit text-rose">{faNum(tests.wrongPct)}٪</div>
                    <div className="text-[10px] text-muted font-bold">غلط</div>
                  </div>
                  <div className="card !rounded-lg p-2.5 bg-surface-2">
                    <div className="text-lg font-extrabold timer-digit">{faNum(tests.totalSessions)}</div>
                    <div className="text-[10px] text-muted font-bold">جلسه تست</div>
                  </div>
                </div>
                <div className="text-xs text-muted text-center">
                  مجموع {faNum(tests.totalQuestions)} سؤال · میانگین زمان {faNum(tests.avgDuration)} دقیقه
                </div>
              </>
            )}
          </div>
        </Card>

        {/* اقدامات سریع */}
        <Card>
          <CardHeader title="شروع مطالعه" />
          <div className="px-4 pb-4 space-y-2">
            <Button className="w-full" onClick={() => navigate('sessions')}>
              <PlayCircle size={16} /> شروع تایمر مطالعه
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate('today')}>
              <Target size={16} /> برنامه امروز
            </Button>
            <Button variant="soft" className="w-full" onClick={() => navigate('subjects')}>
              <Plus size={16} /> افزودن درس / مبحث
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { toast.push('برای شروع، یک مبحث انتخاب کنید', 'info'); navigate('sessions'); }}>
              <Sparkles size={16} /> ثبت جلسه جدید
            </Button>
          </div>
        </Card>
      </div>

      {/* آخرین فعالیت‌ها */}
      <Card>
        <CardHeader title="آخرین فعالیت‌ها" subtitle={`${faNum(activity.length)} مورد اخیر`} />
        <div className="px-4 pb-4">
          {activity.length === 0 ? (
            <EmptyState icon={<Activity size={24} />} title="هنوز فعالیتی ثبت نشده" message="با مطالعه، مرور یا تست، فعالیت‌هایتان اینجا نمایش داده می‌شود." />
          ) : (
            <div className="space-y-1.5">
              {activity.map((a) => (
                <div key={a.id} className="note-row !py-2">
                  <span className={`dot bg-${a.color} shrink-0`} />
                  <span className="flex-1">{a.text}</span>
                  <span className="text-[11px] text-muted shrink-0">{formatDate(a.date, state.settings.calendar)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* مباحث عقب‌افتاده */}
      {overdue.length > 0 && (
        <Card>
          <CardHeader
            title={`مباحث با مرور عقب‌افتاده (${faNum(overdue.length)})`}
            subtitle="این موارد عقب نیفتاده و به همان موعد اصلی باقی مانده‌اند"
            action={<Button variant="danger" size="xs" onClick={() => navigate('reviews')}>رفتن به مرورها</Button>}
          />
          <div className="px-4 pb-4 space-y-1.5">
            {overdue.slice(0, 6).map((r) => {
              const t = state.topics.find((x) => x.id === r.topicId);
              const sub = t ? L.subjectById.get(t.subjectId) : undefined;
              return (
                <div key={r.id} className="note-row">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: subjectColor(L, sub?.id) }} />
                  <span className="flex-1 font-semibold text-xs">{t?.name ?? 'مبحث حذف‌شده'}</span>
                  <Pill tone="rose">{faNum(diffDays(today, r.scheduledDate))} روز عقب</Pill>
                </div>
              );
            })}
            {overdue.length > 6 && <div className="text-[11px] text-muted text-center">و {faNum(overdue.length - 6)} مورد دیگر…</div>}
          </div>
        </Card>
      )}

      {/* روند تست */}
      {state.settings.chartsEnabled && state.tests.length > 1 && (
        <Card>
          <CardHeader title="روند درصد صحیح تست‌ها" subtitle={`${faNum(state.tests.length)} جلسه آخر`} />
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted mb-2">
              <TrendingUp size={14} className="text-sky" /> تغییر عملکرد در جلسات اخیر
            </div>
            <TestTrendChart />
          </div>
        </Card>
      )}
    </div>
  );
}

import { LineChart } from '../components/Charts';
function TestTrendChart() {
  const { state } = useStore();
  const sorted = [...state.tests].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  const data = sorted.map((t, i) => ({
    label: `${faNum(i + 1)}`,
    value: t.total ? Math.round((t.correct / t.total) * 100) : 0,
  }));
  return <LineChart data={data} color="var(--sky)" height={130} />;
}
