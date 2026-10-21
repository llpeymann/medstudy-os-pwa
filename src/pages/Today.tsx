/* ============ صفحه برنامه امروز ============ */
import React, { useMemo, useState } from 'react';
import {
  ListTodo, Brain, FlaskConical, BookOpen, AlertTriangle, CheckCircle2,
  Clock, Plus, ChevronLeft, ArrowRightLeft, StickyNote, Trash2, CalendarClock,
  Target, Sparkles, Send,
} from 'lucide-react';
import { useStore, newTask, completeReview } from '../state/store';
import { taskStats } from '../lib/progress';
import { reviewBuckets, suggestCatchupPlan } from '../lib/reviews';
import { addDaysISO, formatDate, isValidISODate } from '../lib/dates';
import { faNum, faPct, minutesToText } from '../lib/format';
import { Card, CardHeader, Button, Pill, EmptyState, Modal, Field, inputCls, ConfirmDialog, Segmented, useToast, Donut } from '../components/ui';
import ReviewForm from '../components/ReviewForm';
import { useLookups } from '../lib/lookups';
import type { Task } from '../types';

const TASK_TYPE_LABEL: Record<Task['type'], string> = {
  study: 'مطالعه', review: 'مرور', test: 'تست', custom: 'سفارشی',
};

export default function Today() {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const L = useLookups(state);
  const [addOpen, setAddOpen] = useState(false);
  const [moveFor, setMoveFor] = useState<Task | null>(null);
  const [noteFor, setNoteFor] = useState<Task | null>(null);
  const [spendFor, setSpendFor] = useState<Task | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [catchupOpen, setCatchupOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  // فرم افزودن وظیفه
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Task['type']>('study');
  const [topicId, setTopicId] = useState('');
  const [targetPages, setTargetPages] = useState('');
  const [targetTests, setTargetTests] = useState('');

  const stats = useMemo(() => taskStats(state.tasks, today), [state.tasks, today]);
  const buckets = useMemo(() => reviewBuckets(state, today), [state, today]);
  const todayTasks = useMemo(
    () => state.tasks.filter((t) => t.date === today).sort((a, b) => Number(a.done) - Number(b.done)),
    [state.tasks, today],
  );
  const overdueTasks = useMemo(
    () => state.tasks.filter((t) => !t.done && t.date < today).sort((a, b) => a.date.localeCompare(b.date)),
    [state.tasks, today],
  );
  const minutesToday = state.sessions.filter((s) => s.date === today).reduce((a, s) => a + s.durationMinutes, 0);
  const goalPct = Math.min(100, (minutesToday / Math.max(1, state.settings.dailyGoalMinutes)) * 100);
  const openCount = todayTasks.filter((t) => !t.done).length;
  const overCap = openCount > state.settings.dailyTaskCap;

  const catchup = useMemo(
    () => suggestCatchupPlan(overdueTasks.length, today, state.settings.examDate, state.settings.studyDaysPerWeek, state.restDays.map((r) => r.date)),
    [overdueTasks.length, today, state.settings.examDate, state.settings.studyDaysPerWeek, state.restDays],
  );

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.push('عنوان وظیفه را وارد کنید', 'error'); return; }
    const topic = state.topics.find((t) => t.id === topicId) || null;
    dispatch({
      type: 'ADD_TASK',
      task: newTask(
        today,
        title,
        type,
        topic?.subjectId ?? null,
        topic?.id ?? null,
        targetPages.trim() ? Math.max(0, Number(targetPages)) : null,
        targetTests.trim() ? Math.max(0, Number(targetTests)) : null,
      ),
    });
    setTitle(''); setType('study'); setTopicId(''); setTargetPages(''); setTargetTests('');
    setAddOpen(false);
    toast.push('وظیفه به برنامه امروز اضافه شد');
  };

  const applyCatchup = () => {
    // انتقال وظایف عقب‌افتاده به روزهای پیشنهادی — فقط با تأیید کاربر
    let idx = 0;
    for (const t of overdueTasks) {
      const slot = catchup[idx % catchup.length];
      if (slot) {
        dispatch({ type: 'UPDATE_TASK', task: { ...t, date: slot.date, postponeReason: 'جبران خودکار (با تأیید کاربر)' } });
      }
      idx++;
    }
    setCatchupOpen(false);
    toast.push(`${faNum(overdueTasks.length)} وظیفه عقب‌افتاده به روزهای پیشنهادی منتقل شد`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 fade-up">
      {/* سر صفحه: تاریخ + هدف زمانی */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4 sm:col-span-2">
          <div>
            <div className="text-xs text-muted font-bold">امروز</div>
            <div className="font-extrabold text-lg">{formatDate(today, state.settings.calendar, true)}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Pill tone={stats.remaining > 0 ? 'amber' : 'emerald'}>
                {faNum(stats.done)} انجام‌شده / {faNum(stats.remaining)} باقی‌مانده
              </Pill>
              {overCap && <Pill tone="rose">سقف روزانه ({faNum(state.settings.dailyTaskCap)}) ت تجاوز شده</Pill>}
            </div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Donut value={goalPct} size={74} stroke={9}>
            <div className="text-sm font-extrabold timer-digit">{faPct(goalPct)}</div>
          </Donut>
          <div>
            <div className="text-xs text-muted font-bold">هدف زمانی امروز</div>
            <div className="font-extrabold">{minutesToText(minutesToday)}</div>
            <div className="text-[10px] text-muted">از {minutesToText(state.settings.dailyGoalMinutes)}</div>
          </div>
        </Card>
      </div>

      {/* مرورهای امروز */}
      <Card>
        <CardHeader
          title="مرورهای موعدرسیده امروز"
          subtitle={`${faNum(buckets.dueToday.length)} مورد`}
          action={<Button variant="ghost" size="xs" onClick={() => window.location.hash = '#/reviews'}>همه مرورها</Button>}
        />
        <div className="px-4 pb-4 space-y-2">
          {buckets.dueToday.length === 0 && buckets.overdue.length === 0 ? (
            <EmptyState icon={<Brain size={24} />} title="امروز مروری موعد ندارید" message="مرورها پس از اتمام مطالعه اولیه مبحث، خودکار برنامه‌ریزی می‌شوند." />
          ) : (
            <>
              {buckets.overdue.length > 0 && (
                <div className="text-[11px] font-bold text-rose">عقب‌افتاده — با اولویت انجام دهید:</div>
              )}
              {[...buckets.overdue, ...buckets.dueToday].slice(0, 8).map((r) => {
                const topic = state.topics.find((t) => t.id === r.topicId);
                const sub = topic ? L.subjectById.get(topic.subjectId) : undefined;
                return (
                  <div key={r.id} className="note-row">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sub?.color ?? 'var(--brand)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">{topic?.name ?? 'مبحث حذف‌شده'}</div>
                      <div className="text-[10px] text-muted">مرور {faNum(r.reviewNumber)} · موعد {formatDate(r.scheduledDate, state.settings.calendar)}</div>
                    </div>
                    <Button size="xs" onClick={() => setReviewFor(r.id)}>ثبت نتیجه</Button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </Card>

      {/* وظایف امروز */}
      <Card>
        <CardHeader
          title="وظایف امروز"
          subtitle={`ظرفیت روزانه: ${faNum(state.settings.dailyTaskCap)} وظیفه`}
          action={
            <div className="flex items-center gap-1">
              <Segmented options={[{ value: 'open', label: 'باز' }, { value: 'all', label: 'همه' }]} value={showDone ? 'all' : 'open'} onChange={(v) => setShowDone(v === 'all')} />
              <Button size="xs" onClick={() => setAddOpen(true)}><Plus size={14} /> وظیفه</Button>
            </div>
          }
        />
        <div className="px-4 pb-4 space-y-2">
          {todayTasks.filter((t) => showDone || !t.done).length === 0 ? (
            <EmptyState
              icon={<ListTodo size={26} />}
              title={showDone ? 'هیچ وظیفه‌ای ثبت نشده' : 'همه وظایف امروز انجام شد!'}
              message="وظیفه جدیدی اضافه کنید یا مرورهای موعدرسیده را انجام دهید."
              action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> افزودن وظیفه</Button>}
            />
          ) : (
            todayTasks.filter((t) => showDone || !t.done).map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                topicName={t.topicId ? L.topicById.get(t.topicId)?.name ?? '—' : undefined}
                subjectColor={t.subjectId ? L.subjectById.get(t.subjectId)?.color : undefined}
                onToggle={() => dispatch({ type: 'TOGGLE_TASK', id: t.id, today })}
                onMove={() => setMoveFor(t)}
                onNote={() => setNoteFor(t)}
                onSpend={() => setSpendFor(t)}
                onDelete={() => dispatch({ type: 'DELETE_TASK', id: t.id })}
              />
            ))
          )}
        </div>
      </Card>

      {/* وظایف عقب‌افتاده */}
      {overdueTasks.length > 0 && (
        <Card className="!border-rose/40">
          <CardHeader
            title={`وظایف عقب‌افتاده (${faNum(overdueTasks.length)})`}
            subtitle="بدون پنهان‌کاری نمایش داده می‌شوند"
            action={
              <div className="flex gap-1">
                <Button variant="ghost" size="xs" onClick={() => setCatchupOpen(true)}><Sparkles size={13} /> پیشنهاد جبران</Button>
              </div>
            }
          />
          <div className="px-4 pb-4 space-y-2">
            {overdueTasks.map((t) => (
              <div key={t.id} className="note-row !border !border-rose/30">
                <AlertTriangle size={14} className="text-rose shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs truncate">{t.title}</div>
                  <div className="text-[10px] text-muted">موعد: {formatDate(t.date, state.settings.calendar)}</div>
                </div>
                <Button size="xs" variant="secondary" onClick={() => dispatch({ type: 'UPDATE_TASK', task: { ...t, date: today } })}>انتقال به امروز</Button>
                <Button size="xs" onClick={() => dispatch({ type: 'TOGGLE_TASK', id: t.id, today })}>انجام شد</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* مدال افزودن وظیفه */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="افزودن وظیفه به امروز">
        <form onSubmit={addTask} className="space-y-4">
          <Field label="عنوان وظیفه" required>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: مطالعه فصل ۳ کنکور" />
          </Field>
          <Field label="نوع وظیفه">
            <Segmented
              options={[
                { value: 'study', label: 'مطالعه' },
                { value: 'review', label: 'مرور' },
                { value: 'test', label: 'تست' },
                { value: 'custom', label: 'سفارشی' },
              ]}
              value={type}
              onChange={setType}
            />
          </Field>
          {state.topics.length > 0 && (
            <Field label="مبحث مرتبط (اختیاری)">
              <select className={inputCls} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">بدون مبحث</option>
                {state.topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="صفحات هدف (اختیاری)">
              <input className={inputCls} type="number" min={0} value={targetPages} onChange={(e) => setTargetPages(e.target.value)} placeholder="۱۰" />
            </Field>
            <Field label="تست هدف (اختیاری)">
              <input className={inputCls} type="number" min={0} value={targetTests} onChange={(e) => setTargetTests(e.target.value)} placeholder="۲" />
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>انصراف</Button>
            <Button type="submit">افزودن</Button>
          </div>
        </form>
      </Modal>

      {/* مدال انتقال وظیفه */}
      <MoveTaskModal task={moveFor} onClose={() => setMoveFor(null)} />

      {/* مدال یادداشت */}
      <NoteModal task={noteFor} onClose={() => setNoteFor(null)} />

      {/* مدال زمان صرف‌شده */}
      <SpendModal task={spendFor} onClose={() => setSpendFor(null)} />

      {/* مدال پیشنهاد جبران */}
      <Modal open={catchupOpen} onClose={() => setCatchupOpen(false)} title="برنامه پیشنهادی جبران">
        <p className="text-sm text-muted leading-6 mb-3">
          {faNum(overdueTasks.length)} وظیفه عقب‌افتاده دارید. پیشنهاد زیر آن‌ها را با رعایت سقف روزانه و روزهای استراحت توزیع می‌کند.
          برنامه روزهای آینده فقط با تأیید شما تغییر می‌کند.
        </p>
        <div className="max-h-60 overflow-y-auto space-y-1.5 mb-4">
          {catchup.map((c) => (
            <div key={c.date} className="note-row justify-between">
              <span>{formatDate(c.date, state.settings.calendar, true)}</span>
              <Pill tone="sky">{faNum(c.count)} وظیفه</Pill>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setCatchupOpen(false)}>انصراف</Button>
          <Button onClick={applyCatchup} disabled={catchup.length === 0}><Send size={14} /> اعمال پیشنهاد</Button>
        </div>
      </Modal>

      {/* ثبت نتیجه مرور */}
      {reviewFor && (() => {
        const r = state.reviews.find((x) => x.id === reviewFor);
        return r ? <ReviewForm review={r} onClose={() => setReviewFor(null)} /> : null;
      })()}
    </div>
  );
}

/* ---------- ردیف وظیفه ---------- */
function TaskRow({ task, topicName, subjectColor: color, onToggle, onMove, onNote, onSpend, onDelete }: {
  task: Task; topicName?: string; subjectColor?: string;
  onToggle: () => void; onMove: () => void; onNote: () => void; onSpend: () => void; onDelete: () => void;
}) {
  return (
    <div className={`note-row !items-start flex-wrap ${task.done ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        className="mt-1 w-4 h-4 shrink-0"
        aria-label={task.done ? 'علامت‌گذاری انجام‌نشده' : 'علامت‌گذاری انجام‌شده'}
      />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${task.done ? 'line-through' : ''}`}>{task.title}</div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] text-muted">
          {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
          <Pill tone="gray">{TASK_TYPE_LABEL[task.type]}</Pill>
          {topicName && <span className="truncate">{topicName}</span>}
          {task.targetPages ? <span>{faNum(task.targetPages)} صفحه</span> : null}
          {task.targetTests ? <span>{faNum(task.targetTests)} تست</span> : null}
          {task.spentMinutes > 0 && <span className="text-brand font-bold">{minutesToText(task.spentMinutes)}</span>}
          {task.postponeReason && <span className="text-amber">دلیل: {task.postponeReason}</span>}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button className="icon-btn" title="ثبت زمان صرف‌شده" onClick={onSpend}><Clock size={15} /></button>
        <button className="icon-btn" title="یادداشت" onClick={onNote}><StickyNote size={15} /></button>
        <button className="icon-btn" title="انتقال به روز دیگر" onClick={onMove}><ArrowRightLeft size={15} /></button>
        <button className="icon-btn hover:!text-rose" title="حذف" onClick={onDelete}><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

/* ---------- مدال انتقال وظیفه ---------- */
function MoveTaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { dispatch, state } = useStore();
  const toast = useToast();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  React.useEffect(() => { if (task) { setDate(task.date); setReason(task.postponeReason ?? ''); } }, [task]);
  if (!task) return null;
  const save = () => {
    if (!isValidISODate(date)) { toast.push('تاریخ معتبر وارد کنید', 'error'); return; }
    dispatch({ type: 'UPDATE_TASK', task: { ...task, date, postponeReason: reason.trim() || null } });
    toast.push(`وظیفه به ${formatDate(date, state.settings.calendar)} منتقل شد`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="انتقال وظیفه به روز دیگر">
      <div className="space-y-4">
        <Field label={`وظیفه: ${task.title}`}>
          <div className="text-xs text-muted">موعد فعلی: {formatDate(task.date, state.settings.calendar)}</div>
        </Field>
        <Field label="تاریخ جدید (میلادی)" required>
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="دلیل تغییر / عقب‌افتادگی (اختیاری)">
          <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: بیماری، امتحان دانشگاه، تعارض برنامه…" />
        </Field>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button onClick={save}><CalendarClock size={15} /> انتقال</Button>
        </div>
      </div>
    </Modal>
  );
}

function NoteModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [note, setNote] = useState('');
  React.useEffect(() => { if (task) setNote(task.note); }, [task]);
  if (!task) return null;
  return (
    <Modal open onClose={onClose} title="یادداشت وظیفه">
      <Field label="یادداشت">
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>انصراف</Button>
        <Button onClick={() => { dispatch({ type: 'UPDATE_TASK', task: { ...task, note } }); toast.push('یادداشت ذخیره شد'); onClose(); }}>ذخیره</Button>
      </div>
    </Modal>
  );
}

function SpendModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [mins, setMins] = useState('');
  React.useEffect(() => { if (task) setMins(String(task.spentMinutes || '')); }, [task]);
  if (!task) return null;
  return (
    <Modal open onClose={onClose} title="ثبت زمان صرف‌شده">
      <Field label={`وظیفه: ${task.title}`}>
        <div className="text-xs text-muted">زمان ثبت‌شده فعلی: {task.spentMinutes ? minutesToText(task.spentMinutes) : '—'}</div>
      </Field>
      <Field label="زمان صرف‌شده (دقیقه)" required>
        <input className={inputCls} type="number" min={0} max={1440} value={mins} onChange={(e) => setMins(e.target.value)} placeholder="مثلاً 45" />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>انصراف</Button>
        <Button onClick={() => {
          const v = Number(mins);
          if (!Number.isFinite(v) || v < 0) { toast.push('مقدار معتبر وارد کنید', 'error'); return; }
          dispatch({ type: 'UPDATE_TASK', task: { ...task, spentMinutes: Math.round(v) } });
          toast.push('زمان صرف‌شده ثبت شد');
          onClose();
        }}>ثبت</Button>
      </div>
    </Modal>
  );
}
