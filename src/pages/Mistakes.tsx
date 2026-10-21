/* ============ صفحه دفترچه اشتباهات ============ */
import React, { useMemo, useState } from 'react';
import {
  NotebookPen, Plus, CheckCircle2, Brain, Filter, Trash2, RotateCcw,
} from 'lucide-react';
import { useStore, newMistake } from '../state/store';
import { MISTAKE_CATEGORIES, mistakeLabel } from '../lib/labels';
import { formatDate, todayISO } from '../lib/dates';
import { faNum } from '../lib/format';
import { Card, CardHeader, Button, Pill, EmptyState, Modal, Field, inputCls, Segmented, ConfirmDialog, useToast } from '../components/ui';
import { useLookups, subjectColor } from '../lib/lookups';
import type { Mistake, MistakeCategory } from '../types';

export default function Mistakes() {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const L = useLookups(state);
  const [addOpen, setAddOpen] = useState(false);
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [catFilter, setCatFilter] = useState<MistakeCategory | 'all'>('all');
  const [deleteFor, setDeleteFor] = useState<Mistake | null>(null);

  const list = useMemo(() => {
    let l = [...state.mistakes].sort((a, b) => b.date.localeCompare(a.date));
    if (onlyUnresolved) l = l.filter((m) => !m.resolved);
    if (catFilter !== 'all') l = l.filter((m) => m.category === catFilter);
    return l;
  }, [state.mistakes, onlyUnresolved, catFilter]);

  const unresolvedCount = state.mistakes.filter((m) => !m.resolved).length;
  const catCounts = useMemo(() => {
    const m = new Map<MistakeCategory, number>();
    for (const x of state.mistakes) m.set(x.category, (m.get(x.category) ?? 0) + 1);
    return m;
  }, [state.mistakes]);

  const convertToReview = (m: Mistake) => {
    if (!m.topicId) {
      toast.push('این اشتباه به مبحثی مرتبط نیست؛ ابتدا مبحث را مشخص کنید', 'error');
      return;
    }
    dispatch({
      type: 'ADD_REVIEW',
      review: {
        id: `rev-${m.topicId}-${Date.now()}`,
        topicId: m.topicId,
        reviewNumber: 0, // مرور فوری از دفترچه اشتباهات
        scheduledDate: today,
        doneDate: null,
        result: null,
        mastery: null,
        durationMinutes: null,
        needsReviewAgain: false,
        errorNotes: `از دفترچه اشتباهات: ${m.questionText.slice(0, 120)}`,
        status: 'pending',
      },
    });
    toast.push('وظیفه مرور فوری ایجاد شد — در «مرورهای امروز» visible است');
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 fade-up">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="text-xl font-extrabold timer-digit">{faNum(state.mistakes.length)}</div>
          <div className="text-[10px] text-muted font-bold mt-0.5">کل اشتباهات</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-extrabold timer-digit text-rose">{faNum(unresolvedCount)}</div>
          <div className="text-[10px] text-muted font-bold mt-0.5">حل‌نشده</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-extrabold timer-digit text-emerald">{faNum(state.mistakes.length - unresolvedCount)}</div>
          <div className="text-[10px] text-muted font-bold mt-0.5">حل‌شده</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-extrabold timer-digit text-violet">{faNum(state.mistakes.filter((m) => m.category === 'knowledge_gap').length)}</div>
          <div className="text-[10px] text-muted font-bold mt-0.5">ضعف علمی</div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="فهرست اشتباهات"
          action={
            <div className="flex items-center gap-1.5 flex-wrap">
              <Segmented options={[{ value: 'all', label: 'همه' }, { value: 'open', label: 'حل‌نشده' }]} value={onlyUnresolved ? 'open' : 'all'} onChange={(v) => setOnlyUnresolved(v === 'open')} />
              <select className={`${inputCls} !w-auto !py-1.5 !text-xs`} value={catFilter} onChange={(e) => setCatFilter(e.target.value as MistakeCategory | 'all')}>
                <option value="all">همه دسته‌ها</option>
                {MISTAKE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={15} /> ثبت اشتباه</Button>
            </div>
          }
        />
        <div className="px-4 pb-4 space-y-2">
          {list.length === 0 ? (
            <EmptyState
              icon={<NotebookPen size={28} />}
              title={onlyUnresolved ? 'اشتباه حل‌نشده‌ای ندارید' : 'هنوز اشتباهی ثبت نشده'}
              message="هر خطایی در تست‌ها را اینجا ثبت کنید تا دفعه بعد تکرار نشود."
              action={<Button size="sm" onClick={() => setAddOpen(true)}>ثبت اولین اشتباه</Button>}
            />
          ) : (
            list.map((m) => {
              const sub = L.subjectById.get(m.subjectId ?? '');
              const topic = L.topicById.get(m.topicId ?? '');
              return (
                <div key={m.id} className={`note-row flex-wrap ${m.resolved ? 'opacity-60' : ''}`}>
                  <input
                    type="checkbox"
                    checked={m.resolved}
                    onChange={() => dispatch({ type: 'UPDATE_MISTAKE', mistake: { ...m, resolved: !m.resolved } })}
                    className="w-4 h-4 shrink-0"
                    aria-label={m.resolved ? 'علامت‌گذاری حل‌نشده' : 'علامت‌گذاری حل‌شده'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Pill tone={subjectColor(L, m.subjectId) === 'var(--brand)' ? 'gray' : 'teal'}>{sub?.name ?? 'بدون درس'}</Pill>
                      <Pill tone="amber">{mistakeLabel(m.category)}</Pill>
                      {m.resolved && <Pill tone="emerald"><CheckCircle2 size={10} /> حل‌شده</Pill>}
                    </div>
                    {m.questionText && <div className="text-xs font-semibold mt-1 leading-5">{m.questionText}</div>}
                    {m.correctAnswer && <div className="text-[11px] text-emerald mt-0.5">پاسخ صحیح: {m.correctAnswer}</div>}
                    {m.note && <div className="text-[11px] text-muted mt-0.5">{m.note}</div>}
                    <div className="text-[10px] text-muted mt-0.5">
                      {topic ? `مبحث: ${topic.name} · ` : ''}{formatDate(m.date, state.settings.calendar)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="xs" variant="secondary" onClick={() => convertToReview(m)} title="تبدیل به وظیفه مرور">
                      <RotateCcw size={13} /> مرور فوری
                    </Button>
                    <button className="icon-btn hover:!text-rose" title="حذف" onClick={() => setDeleteFor(m)}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* توزیع دسته‌ها */}
      {state.mistakes.length > 0 && (
        <Card>
          <CardHeader title="دسته‌بندی اشتباهات" subtitle="کدام نوع خطا بیشتر تکرار می‌شود؟" />
          <div className="px-4 pb-4 space-y-2">
            {MISTAKE_CATEGORIES.map((c) => {
              const n = catCounts.get(c.value) ?? 0;
              const max = Math.max(1, ...catCounts.values());
              return (
                <div key={c.value} className="flex items-center gap-2">
                  <span className="w-32 text-[11px] font-bold text-muted shrink-0">{c.label}</span>
                  <div className="flex-1 h-4 rounded-md bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-md bg-rose/80" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-start text-xs font-bold">{faNum(n)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <MistakeForm open={addOpen} onClose={() => setAddOpen(false)} />
      <ConfirmDialog
        open={!!deleteFor}
        title="حذف اشتباه؟"
        message="این اشتباه از دفترچه حذف می‌شود."
        confirmText="حذف"
        danger
        onConfirm={() => { if (deleteFor) dispatch({ type: 'DELETE_MISTAKE', id: deleteFor.id }); setDeleteFor(null); }}
        onCancel={() => setDeleteFor(null)}
      />
    </div>
  );
}

function MistakeForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [category, setCategory] = useState<MistakeCategory>('knowledge_gap');
  const [note, setNote] = useState('');

  const topics = state.topics.filter((t) => t.subjectId === subjectId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() && !correctAnswer.trim()) {
      toast.push('حداقل متن سؤال یا پاسخ صحیح را وارد کنید', 'error');
      return;
    }
    dispatch({
      type: 'ADD_MISTAKE',
      mistake: newMistake({
        subjectId: subjectId || null,
        topicId: topicId || null,
        questionText: questionText.trim(),
        correctAnswer: correctAnswer.trim(),
        category,
        resolved: false,
        date: today,
        note: note.trim(),
      }),
    });
    setQuestionText(''); setCorrectAnswer(''); setNote(''); setCategory('knowledge_gap');
    toast.push('اشتباه در دفترچه ثبت شد');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="ثبت اشتباه جدید" wide>
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
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="دسته‌بندی" required>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as MistakeCategory)}>
              {MISTAKE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="متن سؤال یا مسئله" hint="چه چیزی را اشتباه پاسخ دادید؟">
          <textarea className="textarea" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="سؤال یا وضعیت خطا…" />
        </Field>
        <Field label="پاسخ صحیح">
          <input className={inputCls} value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="پاسخ درست و توضیح کوتاه" />
        </Field>
        <Field label="یادداشت تحلیلی (اختیاری)">
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="چرا غلط کردم؟ نکته‌ای که باید حفظ کنم…" />
        </Field>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>انصراف</Button>
          <Button type="submit"><Brain size={15} /> ثبت اشتباه</Button>
        </div>
      </form>
    </Modal>
  );
}
