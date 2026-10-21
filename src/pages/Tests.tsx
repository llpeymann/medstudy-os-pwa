/* ============ صفحه تست‌ها و آمار ============ */
import React, { useMemo, useState } from 'react';
import { FlaskConical, Plus, Trash2, TrendingUp, Target, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useStore, newTest } from '../state/store';
import { testStats, testPercentages, validateTestInput } from '../lib/progress';
import { formatDate } from '../lib/dates';
import { faNum, faPct } from '../lib/format';
import { Card, CardHeader, Button, Pill, EmptyState, Modal, Field, inputCls, DataTable, ConfirmDialog, useToast } from '../components/ui';
import { LineChart, HBars } from '../components/Charts';
import { useLookups, subjectColor } from '../lib/lookups';
import type { TestSession } from '../types';

export default function Tests() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const L = useLookups(state);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteFor, setDeleteFor] = useState<TestSession | null>(null);

  const stats = useMemo(() => testStats(state.tests), [state.tests]);
  const trend = useMemo(
    () => [...state.tests].sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
      .map((t, i) => ({ label: `${faNum(i + 1)}`, value: t.total ? Math.round((t.correct / t.total) * 100) : 0 })),
    [state.tests],
  );
  const bySubject = useMemo(() => {
    return state.subjects
      .filter((s) => state.tests.some((t) => t.subjectId === s.id))
      .map((s) => {
        const ts = state.tests.filter((t) => t.subjectId === s.id);
        const tot = ts.reduce((a, t) => a + t.total, 0);
        const cor = ts.reduce((a, t) => a + t.correct, 0);
        return { label: s.name, value: tot ? Math.round((cor / tot) * 100) : 0, color: s.color };
      });
  }, [state.tests, state.subjects]);

  const rows = useMemo(() => [...state.tests]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => {
      const p = testPercentages(t);
      return [
        <span className="font-bold">{formatDate(t.date, state.settings.calendar)}</span>,
        <span className="truncate max-w-32">{t.source || '—'}</span>,
        <span>{L.subjectById.get(t.subjectId ?? '')?.name ?? '—'}</span>,
        <span className="text-muted">{faNum(t.total)}</span>,
        <span className="text-emerald font-bold">{faNum(t.correct)}</span>,
        <span className="text-rose font-bold">{faNum(t.wrong)}</span>,
        <span className="text-muted">{faNum(t.unanswered)}</span>,
        <Pill tone={p.correct >= 60 ? 'emerald' : p.correct >= 40 ? 'amber' : 'rose'}>{faPct(p.correct)}</Pill>,
        <div className="flex gap-1 justify-end">
          <button className="icon-btn hover:!text-rose" title="حذف" onClick={() => setDeleteFor(t)}><Trash2 size={14} /></button>
        </div>,
      ];
    }), [state.tests, state.settings.calendar, L.subjectById]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<FlaskConical size={16} className="text-sky" />} label="جلسات تست" value={faNum(stats.totalSessions)} />
        <StatCard icon={<CheckCircle2 size={16} className="text-emerald" />} label="درصد صحیح" value={faPct(stats.correctPct)} />
        <StatCard icon={<Target size={16} className="text-brand" />} label="سؤالات حل‌شده" value={faNum(stats.totalQuestions)} />
        <StatCard icon={<TrendingUp size={16} className="text-violet" />} label="میانگین زمان" value={`${faNum(stats.avgDuration)} دقیقه`} />
      </div>

      {state.settings.chartsEnabled && state.tests.length > 1 && (
        <Card>
          <CardHeader title="روند درصد صحیح" subtitle="ده جلسه آخر" />
          <div className="px-4 pb-4"><LineChart data={trend} height={140} color="var(--emerald)" /></div>
        </Card>
      )}

      {bySubject.length > 0 && (
        <Card>
          <CardHeader title="درستی بر اساس درس" subtitle="درصد صحیح تجمعی" />
          <div className="px-4 pb-4"><HBars data={bySubject} max={100} /></div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="تاریخچه تست‌ها"
          subtitle={`${faNum(stats.totalSessions)} جلسه`}
          action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={15} /> ثبت تست</Button>}
        />
        <div className="px-4 pb-4">
          {state.tests.length === 0 ? (
            <EmptyState
              icon={<FlaskConical size={28} />}
              title="هنوز تستی ثبت نشده"
              message="نتایج تست‌های خود را ثبت کنید تا روند و ضعف‌های شما تحلیل شود."
              action={<Button size="sm" onClick={() => setAddOpen(true)}>ثبت اولین تست</Button>}
            />
          ) : (
            <DataTable
              columns={[
                { key: 'date', title: 'تاریخ' },
                { key: 'source', title: 'منبع' },
                { key: 'subject', title: 'درس' },
                { key: 'total', title: 'کل' },
                { key: 'correct', title: 'صحیح' },
                { key: 'wrong', title: 'غلط' },
                { key: 'unans', title: 'بدون پاسخ' },
                { key: 'pct', title: 'درصد' },
                { key: 'act', title: '' },
              ]}
              rows={rows}
            />
          )}
        </div>
      </Card>

      <TestForm open={addOpen} onClose={() => setAddOpen(false)} />
      <ConfirmDialog
        open={!!deleteFor}
        title="حذف جلسه تست؟"
        message="شمارنده‌های مبحث مرتبط هم اصلاح می‌شود. این عمل قابل برگشت نیست."
        confirmText="حذف تست"
        danger
        onConfirm={() => { if (deleteFor) dispatch({ type: 'DELETE_TEST', id: deleteFor.id }); setDeleteFor(null); }}
        onCancel={() => setDeleteFor(null)}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="text-lg font-extrabold timer-digit leading-5">{value}</div>
        <div className="text-[10px] text-muted font-bold">{label}</div>
      </div>
    </Card>
  );
}

/* ---------- فرم ثبت تست ---------- */
function TestForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [date, setDate] = useState(today);
  const [total, setTotal] = useState('');
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [unanswered, setUnanswered] = useState('');
  const [duration, setDuration] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chapters = state.chapters.filter((c) => c.subjectId === subjectId);
  const topics = state.topics.filter((t) => t.subjectId === subjectId && (topicId ? t.chapterId : true));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const tot = Number(total), cor = Number(correct), wro = Number(wrong);
    const unans = unanswered.trim() ? Number(unanswered) : Math.max(0, tot - cor - wro);
    const err = validateTestInput(tot, cor, wro, unans);
    if (err) { setError(err); return; }
    if (!date) { setError('تاریخ را وارد کنید'); return; }
    dispatch({
      type: 'ADD_TEST',
      test: newTest({
        subjectId: subjectId || null,
        topicId: topicId || null,
        date,
        total: tot, correct: cor, wrong: wro, unanswered: unans,
        durationMinutes: Math.max(1, Number(duration) || 0),
        source: source.trim(), note: note.trim(),
      }),
    });
    toast.push(`تست ثبت شد — ${faPct(tot ? (cor / tot) * 100 : 0)} صحیح`);
    setTotal(''); setCorrect(''); setWrong(''); setUnanswered(''); setDuration(''); setSource(''); setNote('');
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="ثبت جلسه تست" wide>
      <form onSubmit={submit} className="space-y-4">
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
              {topics.filter((t) => chapters.some((c) => c.id === t.chapterId)).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="تاریخ" required>
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="تعداد کل تست" required>
            <input className={inputCls} type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="۲۰" />
          </Field>
          <Field label="صحیح" required>
            <input className={inputCls} type="number" min={0} value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="۱۴" />
          </Field>
          <Field label="غلط" required>
            <input className={inputCls} type="number" min={0} value={wrong} onChange={(e) => setWrong(e.target.value)} placeholder="۴" />
          </Field>
          <Field label="بدون پاسخ" hint="خالی بگذارید تا خودکار محاسبه شود">
            <input className={inputCls} type="number" min={0} value={unanswered} onChange={(e) => setUnanswered(e.target.value)} placeholder="خودکار" />
          </Field>
          <Field label="زمان صرف‌شده (دقیقه)">
            <input className={inputCls} type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="۲۵" />
          </Field>
          <Field label="منبع تست" hint="مثلاً: بسته فیزیولوژی ۱">
            <input className={inputCls} value={source} onChange={(e) => setSource(e.target.value)} placeholder="منبع" />
          </Field>
        </div>
        <Field label="یادداشت (اختیاری)">
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="تحلیل عمومی جلسه…" />
        </Field>
        {error && (
          <div className="note-row !border !border-rose/40 text-rose text-xs">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="note-row text-xs">
          <XCircle size={14} className="text-rose" />
          <span className="flex-1">فرمول درصدها:</span>
          <span>صحیح = صحیح÷کل · غلط = غلط÷کل · بدون‌پاسخ = بدون‌پاسخ÷کل (محافظت در برابر تقسیم بر صفر)</span>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>انصراف</Button>
          <Button type="submit"><Plus size={15} /> ثبت تست</Button>
        </div>
      </form>
    </Modal>
  );
}
