/* ============ صفحه جلسات مطالعه + تایمر ============ */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Timer, Play, Pause, Square, Plus, Trash2, BookOpen, Save, RefreshCw,
} from 'lucide-react';
import { useStore, newSession } from '../state/store';
import { formatDate, todayISO } from '../lib/dates';
import { faNum, msToClock, minutesToText } from '../lib/format';
import { Card, CardHeader, Button, Pill, EmptyState, Modal, Field, inputCls, DataTable, ConfirmDialog, useToast } from '../components/ui';
import { useLookups } from '../lib/lookups';
import type { StudySession } from '../types';

export default function Sessions() {
  const { state, dispatch, today, timer, timerStart, timerPause, timerResume, timerFinish, timerReset } = useStore();
  const toast = useToast();
  const L = useLookups(state);
  const [now, setNow] = useState(Date.now());
  const [addOpen, setAddOpen] = useState(false);
  const [deleteFor, setDeleteFor] = useState<StudySession | null>(null);

  // تاپیر زنده — ولی زمان از timestamp محاسبه می‌شود، نه شمارنده حافظه
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const elapsedMs = timer
    ? timer.accumulatedMs + (timer.running ? now - timer.startedAt : 0)
    : 0;

  const totalMin = useMemo(() => state.sessions.reduce((a, s) => a + s.durationMinutes, 0), [state.sessions]);
  const todayMin = state.sessions.filter((s) => s.date === today).reduce((a, s) => a + s.durationMinutes, 0);
  const weekMin = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
    const iso = weekAgo.toISOString().slice(0, 10);
    return state.sessions.filter((s) => s.date >= iso).reduce((a, s) => a + s.durationMinutes, 0);
  }, [state.sessions]);

  const rows = useMemo(() => [...state.sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((s) => [
      <span className="font-bold whitespace-nowrap">{formatDate(s.date, state.settings.calendar)}</span>,
      <span className="truncate max-w-28">{L.subjectById.get(s.subjectId ?? '')?.name ?? '—'}</span>,
      <span className="truncate max-w-32">{s.topicId ? L.topicById.get(s.topicId)?.name ?? '—' : 'عمومی'}</span>,
      <span className="font-bold">{minutesToText(s.durationMinutes)}</span>,
      <span>{s.pagesStudied != null ? faNum(s.pagesStudied) : '—'}</span>,
      <span>{s.selfAssessment != null ? `${faNum(s.selfAssessment)}/۵` : '—'}</span>,
      <span className="truncate max-w-32 text-muted">{s.note || '—'}</span>,
      <div className="flex justify-end">
        <button className="icon-btn hover:!text-rose" title="حذف" onClick={() => setDeleteFor(s)}><Trash2 size={14} /></button>
      </div>,
    ]), [state.sessions, state.settings.calendar, L]);

  const finishTimer = async () => {
    const minutes = await timerFinish();
    if (minutes && minutes > 0 && timer) {
      dispatch({
        type: 'LOG_SESSION',
        session: newSession({
          subjectId: timer.subjectId,
          topicId: timer.topicId,
          date: today,
          durationMinutes: minutes,
          pagesStudied: null,
          selfAssessment: null,
          note: timer.note,
          startedAt: new Date().toISOString(),
        }),
      });
      toast.push(`جلسه مطالعه ثبت شد: ${minutesToText(minutes)}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 fade-up">
      {/* تایمر */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <div className="timer-digit text-5xl font-extrabold tracking-wider">{msToClock(elapsedMs)}</div>
            <div className="text-[11px] text-muted font-bold mt-1">
              {timer ? (timer.running ? 'در حال شمارش — ذخیره مداوم فعال' : 'متوقف موقت') : 'تایمر مطالعه'}
            </div>
          </div>
          <div className="flex-1 w-full">
            <TimerControls />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-lg font-extrabold timer-digit text-sky">{minutesToText(todayMin)}</div>
          <div className="text-[10px] text-muted font-bold mt-0.5">امروز</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-extrabold timer-digit text-brand">{minutesToText(weekMin)}</div>
          <div className="text-[10px] text-muted font-bold mt-0.5">۷ روز گذشته</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-extrabold timer-digit">{minutesToText(totalMin)}</div>
          <div className="text-[10px] text-muted font-bold mt-0.5">کل مطالعه</div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="تاریخچه جلسات مطالعه"
          subtitle={`${faNum(state.sessions.length)} جلسه`}
          action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={15} /> ثبت دستی</Button>}
        />
        <div className="px-4 pb-4">
          {state.sessions.length === 0 ? (
            <EmptyState
              icon={<Timer size={28} />}
              title="هنوز جلسه مطالعه‌ای ثبت نشده"
              message="از تایمر بالا استفاده کنید یا یک جلسه را دستی ثبت کنید."
            />
          ) : (
            <DataTable
              columns={[
                { key: 'date', title: 'تاریخ' },
                { key: 'subject', title: 'درس' },
                { key: 'topic', title: 'مبحث' },
                { key: 'dur', title: 'مدت' },
                { key: 'pages', title: 'صفحات' },
                { key: 'self', title: 'خودارزیابی' },
                { key: 'note', title: 'یادداشت' },
                { key: 'act', title: '' },
              ]}
              rows={rows}
            />
          )}
        </div>
      </Card>

      <SessionForm open={addOpen} onClose={() => setAddOpen(false)} />
      <ConfirmDialog
        open={!!deleteFor}
        title="حذف جلسه مطالعه؟"
        message="زمان مطالعه این جلسه از آمار کل کم می‌شود."
        confirmText="حذف جلسه"
        danger
        onConfirm={() => {
          if (deleteFor) dispatch({ type: 'DELETE_SESSION', id: deleteFor.id });
          setDeleteFor(null);
        }}
        onCancel={() => setDeleteFor(null)}
      />
    </div>
  );
}

/* ---------- کنترل‌های تایمر ---------- */
function TimerControls() {
  const { state, dispatch, timer, timerStart, timerPause, timerResume, timerFinish, timerReset } = useStore();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // پرکردن فیلدها از تایمر ذخیره‌شده (پس از رفرش)
  useEffect(() => {
    if (timer) {
      setSubjectId(timer.subjectId ?? '');
      setTopicId(timer.topicId ?? '');
      setNote(timer.note);
    }
  }, [timer]);

  const topics = state.topics.filter((t) => t.subjectId === subjectId);

  const start = () => {
    timerStart(subjectId || null, topicId || null, note.trim());
    toast.push('تایمر شروع شد — می‌توانید صفحه را ببندید؛ زمان حفظ می‌شود');
  };

  const finish = async () => {
    setSaving(true);
    try {
      await timerFinish();
      toast.push('تایمر پایان یافت و جلسه ثبت شد');
      setNote(''); setTopicId('');
    } finally {
      setSaving(false);
    }
  };

  if (!timer) {
    return (
      <div className="w-full space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="درس" required>
            <select className={inputCls} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }}>
              <option value="">— انتخاب کنید —</option>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="مبحث (اختیاری)">
            <select className={inputCls} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">— بدون مبحث —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="یادداشت جلسه (اختیاری)">
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: مرور فصل ۲" />
          </Field>
        </div>
        <Button onClick={start} disabled={!subjectId && !topicId} className="w-full sm:w-auto">
          <Play size={16} /> شروع تایمر
        </Button>
        {!subjectId && !topicId && (
          <span className="text-[11px] text-muted">انتخاب درس یا مبحث الزامی است.</span>
        )}
      </div>
    );
  }

  const sub = L_subject(state, timer.subjectId);
  const top = timer.topicId ? state.topics.find((t) => t.id === timer.topicId) : null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Pill tone="sky"><BookOpen size={11} /> {sub?.name ?? '—'}</Pill>
        {top && <Pill tone="teal">{top.name}</Pill>}
        {note && <Pill tone="gray">{note}</Pill>}
      </div>
      <div className="flex gap-2 flex-wrap">
        {timer.running ? (
          <Button variant="secondary" onClick={timerPause}><Pause size={15} /> توقف موقت</Button>
        ) : (
          <Button variant="secondary" onClick={timerResume}><RefreshCw size={15} /> ادامه</Button>
        )}
        <Button variant="primary" onClick={finish} disabled={saving}>
          {saving ? <span className="animate-pulse">در حال ثبت…</span> : <><Square size={15} /> پایان و ثبت جلسه</>}
        </Button>
        <Button variant="ghost" onClick={() => { timerReset(); toast.push('تایمر ریست شد', 'info'); }}>لغو تایمر</Button>
      </div>
      <p className="text-[11px] text-muted">
        زمان از زمان واقعی رویداد محاسبه می‌شود؛ رفرش صفحه یا بستن مرورگر آن را از بین نمی‌برد.
        جلسات تکراری با شناسه منحصربه‌فرد ثبت می‌شوند.
      </p>
    </div>
  );
}

function L_subject(state: { subjects: { id: string; name: string }[] }, id: string | null) {
  return id ? state.subjects.find((s) => s.id === id) : undefined;
}

/* ---------- فرم ثبت دستی ---------- */
function SessionForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState('');
  const [pages, setPages] = useState('');
  const [selfA, setSelfA] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const topics = state.topics.filter((t) => t.subjectId === subjectId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(minutes);
    if (!mins || mins < 1 || mins > 1440) { setError('مدت معتبر (۱ تا ۱۴۴۰ دقیقه) وارد کنید'); return; }
    if (!date) { setError('تاریخ را وارد کنید'); return; }
    dispatch({
      type: 'LOG_SESSION',
      session: newSession({
        subjectId: subjectId || null,
        topicId: topicId || null,
        date,
        durationMinutes: Math.round(mins),
        pagesStudied: pages.trim() ? Math.max(0, Number(pages)) : null,
        selfAssessment: selfA ? Number(selfA) : null,
        note: note.trim(),
        startedAt: new Date().toISOString(),
      }),
    });
    toast.push('جلسه مطالعه ثبت شد');
    setMinutes(''); setPages(''); setSelfA(''); setNote('');
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="ثبت دستی جلسه مطالعه">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="درس" required>
            <select className={inputCls} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }}>
              <option value="">— انتخاب کنید —</option>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="مبحث (اختیاری)">
            <select className={inputCls} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">— بدون مبحث —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="تاریخ" required>
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="مدت (دقیقه)" required>
            <input className={inputCls} type="number" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="۴۵" />
          </Field>
          <Field label="صفحات مطالعه‌شده">
            <input className={inputCls} type="number" min={0} value={pages} onChange={(e) => setPages(e.target.value)} />
          </Field>
          <Field label="خودارزیابی (۱ تا ۵)">
            <select className={inputCls} value={selfA} onChange={(e) => setSelfA(e.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{faNum(n)}</option>)}
            </select>
          </Field>
        </div>
        <Field label="یادداشت">
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <div className="note-row !border !border-rose/40 text-rose text-xs">{error}</div>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>انصراف</Button>
          <Button type="submit"><Save size={15} /> ثبت جلسه</Button>
        </div>
      </form>
    </Modal>
  );
}
