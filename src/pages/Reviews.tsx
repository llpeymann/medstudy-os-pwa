/* ============ صفحه مرورهای هوشمند ============ */
import React, { useMemo, useState } from 'react';
import {
  Brain, AlertTriangle, CalendarClock, CheckCircle2,
  ArrowLeftRight, Ban, Hourglass, Info,
} from 'lucide-react';
import { useStore } from '../state/store';
import { reviewBuckets } from '../lib/reviews';
import { formatDate, addDaysISO, todayISO } from '../lib/dates';
import { faNum } from '../lib/format';
import { Card, CardHeader, Pill, EmptyState, Button, IconButton, Modal, Field, inputCls, ConfirmDialog, useToast } from '../components/ui';
import ReviewForm from '../components/ReviewForm';
import { useLookups, subjectColor } from '../lib/lookups';
import type { ReviewEntry } from '../types';

type Tab = 'due' | 'overdue' | 'upcoming' | 'done';

export default function Reviews() {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const L = useLookups(state);
  const buckets = useMemo(() => reviewBuckets(state, today), [state, today]);
  const [tab, setTab] = useState<Tab>('due');
  const [reviewing, setReviewing] = useState<ReviewEntry | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<ReviewEntry | null>(null);
  const [skipFor, setSkipFor] = useState<ReviewEntry | null>(null);
  const [newDate, setNewDate] = useState('');

  // نزدیک به موعد: ۳ روز آینده
  const near = buckets.upcoming.filter((r) => r.scheduledDate <= addDaysISO(today, 3));
  const future = buckets.upcoming.filter((r) => r.scheduledDate > addDaysISO(today, 3));

  const renderRow = (r: ReviewEntry, bucket: 'due' | 'overdue' | 'upcoming' | 'done') => {
    const topic = state.topics.find((t) => t.id === r.topicId);
    const sub = topic ? L.subjectById.get(topic.subjectId) : undefined;
    return (
      <div key={r.id} className={`note-row flex-wrap ${bucket === 'overdue' ? '!border !border-rose/30' : ''}`}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: subjectColor(L, sub?.id) }} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs truncate">{topic?.name ?? 'مبحث حذف‌شده'}</div>
          <div className="text-[10px] text-muted">
            مرور {faNum(r.reviewNumber)} · {sub?.name ?? ''} · موعد {formatDate(r.scheduledDate, state.settings.calendar)}
            {bucket === 'overdue' && <span className="text-rose font-bold"> (عقب افتاده — همان موعد اصلی)</span>}
          </div>
          {r.errorNotes && <div className="text-[10px] text-amber mt-0.5 truncate">یادداشت: {r.errorNotes}</div>}
        </div>
        {bucket === 'done' ? (
          <div className="flex items-center gap-2 text-[10px] text-muted">
            <Pill tone="emerald">انجام‌شده {r.doneDate ? formatDate(r.doneDate, state.settings.calendar) : ''}</Pill>
            {r.result && <Pill tone="sky">{resultLabel(r.result!)}</Pill>}
            {r.mastery != null && <span>تسلط {faNum(r.mastery)}٪</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <Button size="xs" onClick={() => setReviewing(r)}>ثبت نتیجه</Button>
            <IconButton title="انتقال کنترل‌شده به تاریخ دیگر" onClick={() => { setRescheduleFor(r); setNewDate(r.scheduledDate); }}><ArrowLeftRight size={14} /></IconButton>
            <IconButton title="رد کردن این مرور" className="hover:!text-amber" onClick={() => setSkipFor(r)}><Ban size={14} /></IconButton>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 fade-up">
      {/* خلاصه */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="text-2xl font-extrabold timer-digit text-violet">{faNum(buckets.dueToday.length)}</div>
          <div className="text-[11px] text-muted font-bold mt-1">موعد امروز</div>
        </Card>
        <Card className="p-3 text-center">
          <div className={`text-2xl font-extrabold timer-digit ${buckets.overdue.length ? 'text-rose' : 'text-muted'}`}>{faNum(buckets.overdue.length)}</div>
          <div className="text-[11px] text-muted font-bold mt-1">عقب‌افتاده</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-extrabold timer-digit text-sky">{faNum(buckets.upcoming.length)}</div>
          <div className="text-[11px] text-muted font-bold mt-1">آینده</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-extrabold timer-digit text-emerald">{faNum(buckets.doneToday.length)}</div>
          <div className="text-[11px] text-muted font-bold mt-1">انجام‌شده امروز</div>
        </Card>
      </div>

      {buckets.overdue.length > 0 && (
        <div className="note-row !border !border-rose/30 text-xs">
          <Info size={15} className="text-rose shrink-0" />
          <span>مرورهای عقب‌افتاده هرگز به‌صورت بی‌صدا منتقل یا حذف نمی‌شوند؛ تا زمانی که خودتان اقدام کنید، در فهرست باقی می‌مانند.</span>
        </div>
      )}

      {/* تب‌ها */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {([
          ['due', `موعد امروز (${faNum(buckets.dueToday.length)})`],
          ['overdue', `عقب‌افتاده (${faNum(buckets.overdue.length)})`],
          ['upcoming', `نزدیک به موعد (${faNum(near.length)})`],
          ['done', `انجام‌شده امروز (${faNum(buckets.doneToday.length)})`],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
              tab === k ? 'bg-brand text-white border-brand' : 'border-border text-muted hover:bg-surface-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* محتوای تب */}
      <Card>
        <div className="p-4 space-y-2">
          {tab === 'due' && (
            buckets.dueToday.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={26} />} title="امروز مروری موعد ندارید" message="مرورهای آینده در تب «نزدیک به موعد» نمایش داده می‌شوند." />
            ) : buckets.dueToday.map((r) => renderRow(r, 'due'))
          )}
          {tab === 'overdue' && (
            buckets.overdue.length === 0 ? (
              <EmptyState icon={<Hourglass size={26} />} title="هیچ مروری عقب نیفتاده" message="عالی است! همه مرورها به‌موقع انجام شده‌اند." />
            ) : buckets.overdue.map((r) => renderRow(r, 'overdue'))
          )}
          {tab === 'upcoming' && (
            near.length === 0 ? (
              <EmptyState icon={<CalendarClock size={26} />} title="مروری در ۳ روز آینده نیست" message="مرورهای بعدی پس از ثبت نتیجه مرور فعلی برنامه‌ریزی می‌شوند." />
            ) : (
              <>
                {near.map((r) => renderRow(r, 'upcoming'))}
                {future.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted font-bold py-2">مرورهای دورتر ({faNum(future.length)})</summary>
                    <div className="space-y-2 pt-1">{future.slice(0, 20).map((r) => renderRow(r, 'upcoming'))}</div>
                  </details>
                )}
              </>
            )
          )}
          {tab === 'done' && (
            buckets.doneToday.length === 0 ? (
              <EmptyState icon={<Brain size={26} />} title="امروز هنوز مروری انجام نشده" message="مرورهای انجام‌شده امروز اینجا ثبت می‌شوند." />
            ) : buckets.doneToday.map((r) => renderRow(r, 'done'))
          )}
        </div>
      </Card>

      {/* مدال‌ها */}
      {reviewing && <ReviewForm review={reviewing} onClose={() => setReviewing(null)} />}

      <Modal open={!!rescheduleFor} onClose={() => setRescheduleFor(null)} title="انتقال کنترل‌شده مرور">
        <Field label={`مرور ${rescheduleFor ? faNum(rescheduleFor.reviewNumber) : ''} — موعد فعلی: ${rescheduleFor ? formatDate(rescheduleFor.scheduledDate, state.settings.calendar) : ''}`}>
          <input className={inputCls} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        </Field>
        <p className="text-xs text-muted leading-5 my-2">
          این عمل فقط موعد را با اطلاع شما تغییر می‌دهد؛ مرور عقب‌افتاده پاک نمی‌شود.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setRescheduleFor(null)}>انصراف</Button>
          <Button onClick={() => {
            if (!rescheduleFor || !newDate) return;
            dispatch({ type: 'RESCHEDULE_REVIEW', id: rescheduleFor.id, newDate });
            toast.push('موعد مرور با موفقیت تغییر کرد');
            setRescheduleFor(null);
          }}>اعمال تغییر</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!skipFor}
        title="رد این مرور؟"
        message="مرور ردشده در گزارش‌ها به‌عنوان «ردشده» ثبت می‌شود و مرور بعدی برنامه‌ریزی نمی‌شود."
        confirmText="رد مرور"
        onConfirm={() => { if (skipFor) dispatch({ type: 'SKIP_REVIEW', id: skipFor.id }); setSkipFor(null); }}
        onCancel={() => setSkipFor(null)}
      />
    </div>
  );
}

function resultLabel(r: NonNullable<ReviewEntry['result']>): string {
  return { good: 'خوب', ok: 'متوسط', poor: 'ضعیف', forgotten: 'فراموش' }[r];
}
