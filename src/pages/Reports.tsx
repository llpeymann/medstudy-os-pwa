/* ============ صفحه گزارش پیشرفت ============ */
import React, { useMemo, useState } from 'react';
import {
  BarChart3, BookOpen, Brain, CheckCircle2, Clock, Flame,
  Info, Scale, Target, TrendingUp, AlertTriangle, ListTodo, FlaskConical,
} from 'lucide-react';
import { useStore } from '../state/store';
import {
  overallProgress, percent, testStats, totalStudyMinutes,
  weeklyActivity, studyStreak, sessionsBySubject,
} from '../lib/progress';
import { overdueReviews } from '../lib/reviews';
import { todayISO } from '../lib/dates';
import { faNum, faPct, minutesToText } from '../lib/format';
import { Card, CardHeader, Button, Pill, EmptyState, Segmented, ProgressBar } from '../components/ui';
import { BarChart, LineChart } from '../components/Charts';
import { useLookups } from '../lib/lookups';

export default function Reports() {
  const { state, today } = useStore();
  const L = useLookups(state);
  const [weighted, setWeighted] = useState(false);
  const prog = overallProgress(state);
  const stats = testStats(state.tests);
  const week = weeklyActivity(state);
  const overdue = overdueReviews(state, today);
  const streak = studyStreak(state);
  const minsBySubj = sessionsBySubject(state);
  const doneTasks = state.tasks.filter((t) => t.done).length;
  const totalTasks = state.tasks.length;

  const studiedPct = weighted ? prog.studiedWeightedPct : prog.studiedPct;

  const subjectRows = useMemo(() => state.subjects.map((s) => {
    const topics = state.topics.filter((t) => t.subjectId === s.id);
    const studied = topics.filter((t) =>
      ['initial_done', 'needs_review', 'mastered', 'needs_more_tests'].includes(t.studyStatus)).length;
    const tests = state.tests.filter((x) => x.subjectId === s.id);
    const tot = tests.reduce((a, x) => a + x.total, 0);
    const cor = tests.reduce((a, x) => a + x.correct, 0);
    return {
      id: s.id, name: s.name, color: s.color,
      topics: topics.length,
      studiedPct: percent(studied, topics.length),
      masteryAvg: topics.length ? Math.round(topics.reduce((a, t) => a + t.mastery, 0) / topics.length) : 0,
      minutes: minsBySubj[s.id] ?? 0,
      testPct: percent(cor, tot),
    };
  }), [state, minsBySubj]);

  const toneColor: Record<string, string> = {
    sky: 'var(--sky)', violet: 'var(--violet)', emerald: 'var(--emerald)',
    amber: 'var(--amber)', rose: 'var(--rose)', brand: 'var(--brand)',
    teal: 'var(--brand)', gray: 'var(--muted)',
  };
  const kpis = [
    { icon: <BookOpen size={16} style={{ color: 'var(--sky)' }} />, label: 'مباحث مطالعه‌شده', value: faPct(weighted ? prog.studiedWeightedPct : prog.studiedPct), sub: `${faNum(prog.studied)} از ${faNum(prog.totalTopics)} مبحث`, tone: 'sky' },
    { icon: <Brain size={16} style={{ color: 'var(--violet)' }} />, label: 'مباحث مرورشده', value: faPct(prog.reviewedPct), sub: `${faNum(prog.reviewed)} مبحث با حداقل یک مرور`, tone: 'violet' },
    { icon: <Target size={16} style={{ color: 'var(--emerald)' }} />, label: 'تسلط مناسب', value: faPct(prog.masteredPct), sub: `آستانه: ${faNum(state.settings.masteredThreshold)}٪`, tone: 'emerald' },
    { icon: <CheckCircle2 size={16} style={{ color: 'var(--amber)' }} />, label: 'وظایف انجام‌شده', value: faNum(doneTasks), sub: `از ${faNum(totalTasks)} وظیفه کل`, tone: 'amber' },
    { icon: <Clock size={16} style={{ color: 'var(--brand)' }} />, label: 'زمان مطالعه', value: minutesToText(totalStudyMinutes(state)), sub: `هدف روزانه: ${minutesToText(state.settings.dailyGoalMinutes)}`, tone: 'teal' },
    { icon: <FlaskConical size={16} style={{ color: 'var(--emerald)' }} />, label: 'میانگین صحیح تست', value: faPct(stats.correctPct), sub: `${faNum(stats.totalSessions)} جلسه تست`, tone: 'emerald' },
    { icon: <AlertTriangle size={16} style={{ color: overdue.length ? 'var(--rose)' : 'var(--muted)' }} />, label: 'مرورهای عقب‌افتاده', value: faNum(overdue.length), sub: 'بدون جابه‌جایی بی‌صدا', tone: overdue.length ? 'rose' : 'gray' },
    { icon: <Flame size={16} style={{ color: 'var(--amber)' }} />, label: 'سری مطالعه', value: `${faNum(streak)} روز`, sub: 'روزهای متوالی مطالعه', tone: 'amber' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 fade-up">
      {/* روش‌شناسی */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-brand shrink-0 mt-0.5" />
          <div className="text-xs leading-6 text-muted">
            <b className="text-ink">روش محاسبه پیشرفت (یکسان و مستند):</b>
            مطالعه‌شده = مباحث با وضعیت «مطالعه اولیه تمام شده» و بالاتر ÷ کل مباحث.
            مرورشده = مباحث با حداقل یک مرور انجام‌شده ÷ کل مباحث.
            تسلط = مباحثی که میزان تسلطشان به آستانه تنظیمات رسیده ÷ کل مباحث.
            این سه شاخص مستقل هستند و علامت مطالعه به‌خودی‌خود به معنای تسلط نیست.
          </div>
        </div>
        <div className="mt-3">
          <Segmented
            options={[{ value: 'plain', label: 'بدون وزن‌دهی' }, { value: 'weighted', label: 'وزن‌دهی بر اساس صفحات' }]}
            value={weighted ? 'weighted' : 'plain'}
            onChange={(v) => setWeighted(v === 'weighted')}
          />
          <p className="text-[10px] text-muted mt-1.5">
            {weighted
              ? 'در حالت وزن‌دار، مباحثی که تعداد صفحه دارند، به نسبت حجمشان در درصد کل وزن دارند. مباحث بدون صفحه در این محاسبه شرکت نمی‌کنند.'
              : 'همه مباحث فارغ از حجم، وزن یکسان دارند.'}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">{k.icon}</div>
              <div className="text-[10px] font-bold text-muted leading-4">{k.label}</div>
            </div>
            <div className="text-xl font-extrabold timer-digit" style={{ color: toneColor[k.tone] }}>{k.value}</div>
            <div className="text-[10px] text-muted mt-0.5">{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* جمع‌بندی پیشرفت */}
      <Card>
        <CardHeader title="خلاصه وضعیت مطالعه" subtitle={`بر اساس ${weighted ? 'وزن‌دار' : 'یکسان'} — ${faPct(studiedPct)}`} />
        <div className="px-4 pb-4 space-y-3">
          <ProgressRow label="مطالعه اولیه" value={studiedPct} color="var(--sky)" />
          <ProgressRow label="مرور فاصله‌دار" value={prog.reviewedPct} color="var(--violet)" />
          <ProgressRow label={`تسلط مناسب (≥${faNum(state.settings.masteredThreshold)}٪)`} value={prog.masteredPct} color="var(--emerald)" />
          <ProgressRow label="نیازمند مرور" value={percent(prog.needsReview, prog.totalTopics)} color="var(--amber)" />
          <ProgressRow label="نیازمند تست بیشتر" value={percent(prog.needsMoreTests, prog.totalTopics)} color="var(--rose)" />
        </div>
      </Card>

      {/* نمودارها */}
      {state.settings.chartsEnabled && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="فعالیت ۷ روز گذشته" subtitle="دقیقه مطالعه" />
            <div className="px-4 pb-4"><BarChart data={week.map((w) => ({ label: w.label, value: w.minutes }))} height={150} /></div>
          </Card>
          <Card>
            <CardHeader title="روند تست‌ها" subtitle={`${faNum(state.tests.length)} جلسه`} />
            <div className="px-4 pb-4">
              {state.tests.length > 1 ? (
                <LineChart data={[...state.tests].sort((a, b) => a.date.localeCompare(b.date)).slice(-12).map((t, i) => ({ label: faNum(i + 1), value: t.total ? Math.round((t.correct / t.total) * 100) : 0 }))} height={150} color="var(--emerald)" />
              ) : (
                <EmptyState icon={<TrendingUp size={22} />} title="داده کافی نیست" message="حداقل دو جلسه تست برای نمایش روند لازم است." />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* جدول دروس */}
      <Card>
        <CardHeader title="وضعیت تفصیلی دروس" subtitle={state.settings.chartsEnabled ? 'همه شاخص‌ها از داده واقعی محاسبه شده‌اند' : undefined} />
        <div className="px-4 pb-4 space-y-3">
          {subjectRows.length === 0 && <EmptyState icon={<BarChart3 size={24} />} title="هنوز درسی ثبت نشده" />}
          {subjectRows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                <span className="font-extrabold text-sm flex-1">{r.name}</span>
                <Pill tone="gray">{faNum(r.topics)} مبحث</Pill>
              </div>
              <ProgressRow label="مطالعه" value={r.studiedPct} color={r.color} compact />
              <ProgressRow label="تسلط میانگین" value={r.masteryAvg} color="var(--violet)" compact />
              <div className="flex gap-4 text-[11px] text-muted flex-wrap">
                <span>زمان: {minutesToText(r.minutes)}</span>
                <span>دقت تست: {faPct(r.testPct)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* فهرست مباحث بر اساس وضعیت */}
      <Card>
        <CardHeader title="توزیع وضعیت مباحث" />
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <StatusCount tone="gray" label="مطالعه‌نشده" count={prog.notStarted} />
          <StatusCount tone="sky" label="در حال مطالعه" count={prog.inProgress} />
          <StatusCount tone="indigo" label="مطالعه اولیه تمام" count={prog.studied - prog.needsReview - prog.mastered - prog.needsMoreTests >= 0 ? Math.max(0, prog.studied - prog.needsReview - prog.mastered - prog.needsMoreTests) : 0} />
          <StatusCount tone="amber" label="نیازمند مرور" count={prog.needsReview} />
          <StatusCount tone="emerald" label="تسلط مناسب" count={prog.mastered} />
          <StatusCount tone="violet" label="نیازمند تست بیشتر" count={prog.needsMoreTests} />
        </div>
      </Card>

      {state.topics.length === 0 && (
        <EmptyState
          icon={<Scale size={28} />}
          title="داده‌ای برای گزارش نیست"
          message="با ثبت دروس، مباحث و جلسات مطالعه، این گزارش از داده‌های واقعی شما ساخته می‌شود."
          action={<Button onClick={() => window.location.hash = '#/subjects'}>رفتن به دروس</Button>}
        />
      )}
    </div>
  );
}

function ProgressRow({ label, value, color, compact }: { label: string; value: number; color: string; compact?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold mb-1">
        <span className="text-muted">{label}</span>
        <span>{faPct(value)}</span>
      </div>
      <ProgressBar value={value} color={color} className={compact ? '!h-1.5' : ''} />
    </div>
  );
}

function StatusCount({ tone, label, count }: { tone: string; label: string; count: number }) {
  return (
    <div className="note-row !py-2">
      <Pill tone={tone}>{faNum(count)}</Pill>
      <span className="font-bold">{label}</span>
    </div>
  );
}

void ListTodo;
