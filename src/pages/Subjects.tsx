/* ============ صفحه دروس و مباحث ============ */
import React, { useMemo, useState } from 'react';
import {
  Plus, Search, ChevronDown, ChevronRight, Pencil, Trash2,
  ArrowUp, ArrowDown, BookOpen, Layers, FileText, Brain,
  CalendarClock, CheckCircle2, Star, Filter, X, Sparkles,
} from 'lucide-react';
import { useStore, newSubject, newChapter, newTopic, completeInitialStudy } from '../state/store';
import { faNum, faPct } from '../lib/format';
import { formatDate, todayISO } from '../lib/dates';
import {
  Card, CardHeader, Button, Pill, EmptyState, Modal, Field, inputCls,
  Segmented, ConfirmDialog, useToast, IconButton, ProgressBar,
} from '../components/ui';
import {
  STUDY_STATUSES, studyStatusLabel, studyStatusTone,
  PRIORITIES, priorityLabel, priorityTone,
  DIFFICULTIES, SUBJECT_COLORS,
} from '../lib/labels';
import { topicNextReview, suggestReviewDate } from '../lib/reviews';
import type { Chapter, Priority, Difficulty, StudyStatus, Subject, Topic } from '../types';

type SortKey = 'name' | 'priority' | 'review' | 'mastery';

export default function Subjects() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [dueFilter, setDueFilter] = useState<'all' | 'due' | 'overdue'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [subjectModal, setSubjectModal] = useState(false);
  const [chapterFor, setChapterFor] = useState<Subject | null>(null);
  const [topicModal, setTopicModal] = useState<{ topic: Topic; chapterId: string; isNew?: boolean } | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [deleteChapter, setDeleteChapter] = useState<Chapter | null>(null);
  const [deleteTopic, setDeleteTopic] = useState<Topic | null>(null);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of state.topics) m.set(t.subjectId, (m.get(t.subjectId) ?? 0) + 1);
    return m;
  }, [state.topics]);

  const chapterCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of state.topics) m.set(t.chapterId, (m.get(t.chapterId) ?? 0) + 1);
    return m;
  }, [state.topics]);

  const minutesBySubject = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of state.sessions) if (s.subjectId) m.set(s.subjectId, (m.get(s.subjectId) ?? 0) + s.durationMinutes);
    return m;
  }, [state.sessions]);

  const filteredTopics = useMemo(() => {
    let list = state.topics;
    if (query.trim()) {
      const q = query.trim();
      list = list.filter((t) => t.name.includes(q));
    }
    if (statusFilter !== 'all') list = list.filter((t) => t.studyStatus === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((t) => t.priority === priorityFilter);
    if (dueFilter !== 'all') {
      const today = todayISO();
      list = list.filter((t) => {
        const nxt = topicNextReview(state, t.id);
        if (!nxt) return false;
        if (dueFilter === 'overdue') return nxt < today;
        if (dueFilter === 'due') return nxt === today;
        return nxt <= today;
      });
    }
    const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'fa');
      if (sortKey === 'priority') return pOrder[a.priority] - pOrder[b.priority];
      if (sortKey === 'mastery') return a.mastery - b.mastery;
      const ra = topicNextReview(state, a.id) ?? '9999';
      const rb = topicNextReview(state, b.id) ?? '9999';
      return ra.localeCompare(rb);
    });
    return list;
  }, [state, query, statusFilter, priorityFilter, dueFilter, sortKey]);

  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const subjectProgressPct = (subjectId: string): number => {
    const topics = state.topics.filter((t) => t.subjectId === subjectId);
    if (!topics.length) return 0;
    const studied = topics.filter((t) =>
      ['initial_done', 'needs_review', 'mastered', 'needs_more_tests'].includes(t.studyStatus)).length;
    return Math.round((studied / topics.length) * 100);
  };

  const addSubject = (name: string, color: string) => {
    dispatch({ type: 'ADD_SUBJECT', subject: newSubject(name, color, state.subjects.length + 1) });
    toast.push(`درس «${name}» اضافه شد`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 fade-up">
      {/* نوار ابزار */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-44">
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted" />
            <input
              className={`${inputCls} !ps-9`}
              placeholder="جست‌وجو در مباحث…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className={`${inputCls} !w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StudyStatus | 'all')}>
            <option value="all">همه وضعیت‌ها</option>
            {STUDY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className={`${inputCls} !w-auto`} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}>
            <option value="all">همه اولویت‌ها</option>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className={`${inputCls} !w-auto`} value={dueFilter} onChange={(e) => setDueFilter(e.target.value as 'all' | 'due' | 'overdue')}>
            <option value="all">همه موعدها</option>
            <option value="due">موعد امروز</option>
            <option value="overdue">عقب‌افتاده</option>
          </select>
          <select className={`${inputCls} !w-auto`} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="name">مرتب‌سازی: نام</option>
            <option value="priority">مرتب‌سازی: اولویت</option>
            <option value="review">مرتب‌سازی: موعد مرور</option>
            <option value="mastery">مرتب‌سازی: تسلط</option>
          </select>
          <Button size="sm" onClick={() => setSubjectModal(true)}><Plus size={15} /> درس جدید</Button>
        </div>
      </Card>

      {/* لیست مباحث فیلترشده */}
      {(query || statusFilter !== 'all' || priorityFilter !== 'all' || dueFilter !== 'all') && (
        <Card>
          <CardHeader title={`نتایج جست‌وجو (${faNum(filteredTopics.length)})`} action={<IconButton title="پاک‌سازی فیلتر" onClick={() => { setQuery(''); setStatusFilter('all'); setPriorityFilter('all'); setDueFilter('all'); }}><X size={16} /></IconButton>} />
          <div className="px-4 pb-3">
            {filteredTopics.length === 0 ? (
              <EmptyState icon={<Search size={24} />} title="مبحثی مطابق فیلتر یافت نشد" message="فیلترها را تغییر دهید." />
            ) : (
              <div className="divide-y divide-border">
                {filteredTopics.slice(0, 60).map((t) => (
                  <TopicFlatRow key={t.id} topic={t} onOpen={() => setTopicModal({ topic: t, chapterId: t.chapterId })} />
                ))}
                {filteredTopics.length > 60 && <div className="text-xs text-muted py-2">۶۰ مورد اول نمایش داده شد — فیلتر را دقیق‌تر کنید.</div>}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* درس‌ها */}
      {state.subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title="هنوز درسی ثبت نشده است"
          message="اولین درس خود را اضافه کنید؛ سپس فصل‌ها و مباحث را بسازید. ساختار: درس ← فصل ← مبحث ← وظیفه مطالعاتی."
          action={<Button onClick={() => setSubjectModal(true)}><Plus size={15} /> افزودن اولین درس</Button>}
        />
      ) : (
        [...state.subjects].sort((a, b) => a.order - b.order).map((s) => (
          <Card key={s.id} className="overflow-hidden">
            {/* سر درس */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
              <span className="w-3.5 h-3.5 rounded-lg shrink-0" style={{ background: s.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold truncate">{s.name}</div>
                <div className="text-[10px] text-muted">
                  {faNum(state.chapters.filter((c) => c.subjectId === s.id).length)} فصل · {faNum(topicCounts.get(s.id) ?? 0)} مبحث · {faNum(minutesBySubject.get(s.id) ?? 0)} دقیقه مطالعه
                </div>
              </div>
              <div className="hidden sm:block w-28">
                <ProgressBar value={subjectProgressPct(s.id)} color={s.color} />
                <div className="text-[10px] text-muted text-center mt-0.5">{faPct(subjectProgressPct(s.id))}</div>
              </div>
              <div className="flex items-center gap-0.5">
                <IconButton title="انتقال به بالا" onClick={() => dispatch({ type: 'MOVE_SUBJECT', id: s.id, dir: -1 })}><ArrowUp size={15} /></IconButton>
                <IconButton title="انتقال به پایین" onClick={() => dispatch({ type: 'MOVE_SUBJECT', id: s.id, dir: 1 })}><ArrowDown size={15} /></IconButton>
                <IconButton title="ویرایش" onClick={() => setEditSubject(s)}><Pencil size={15} /></IconButton>
                <IconButton title="حذف درس" className="hover:!text-rose" onClick={() => setDeleteSubject(s)}><Trash2 size={15} /></IconButton>
              </div>
            </div>
            {/* فصل‌ها */}
            <div className="divide-y divide-border">
              {state.chapters.filter((c) => c.subjectId === s.id).sort((a, b) => a.order - b.order).map((ch) => (
                <ChapterBlock
                  key={ch.id}
                  chapter={ch}
                  expanded={!!expanded[ch.id]}
                  onToggle={() => toggleExpand(ch.id)}
                  onEdit={() => setChapterFor(s)}
                  onMove={(dir) => dispatch({ type: 'MOVE_CHAPTER', id: ch.id, dir })}
                  onDelete={() => setDeleteChapter(ch)}
                  onAddTopic={() => setTopicModal({ topic: emptyTopic(s.id, ch.id), chapterId: ch.id, isNew: true })}
                  topics={state.topics.filter((t) => t.chapterId === ch.id)}
                  onOpenTopic={(t) => setTopicModal({ topic: t, chapterId: ch.id })}
                />
              ))}
              {state.chapters.filter((c) => c.subjectId === s.id).length === 0 && (
                <div className="px-4 py-3 text-sm text-muted">هنوز فصلی برای این درس ثبت نشده است.</div>
              )}
            </div>
            <div className="px-4 py-2.5 flex gap-2 bg-surface-2/50">
              <Button variant="ghost" size="xs" onClick={() => setChapterFor(s)}><Plus size={13} /> فصل جدید</Button>
            </div>
          </Card>
        ))
      )}

      {/* مدال‌ها */}
      {subjectModal && <SubjectModal onClose={() => setSubjectModal(false)} onSave={(name, color) => { addSubject(name, color); }} />}
      {editSubject && <SubjectModal subject={editSubject} onClose={() => setEditSubject(null)} onSave={(name, color) => {
        dispatch({ type: 'UPDATE_SUBJECT', subject: { ...editSubject, name, color } });
        toast.push('درس ویرایش شد');
      }} />}
      {chapterFor && <ChapterModal subject={chapterFor} onClose={() => setChapterFor(null)} onSave={(name) => {
        const order = state.chapters.filter((c) => c.subjectId === chapterFor.id).length + 1;
        dispatch({ type: 'ADD_CHAPTER', chapter: newChapter(chapterFor.id, name, order) });
        toast.push('فصل اضافه شد');
      }} />}
      {topicModal && <TopicModal
        topic={topicModal.topic}
        chapterId={topicModal.chapterId}
        isNew={topicModal.isNew ?? false}
        onClose={() => setTopicModal(null)}
        onDelete={topicModal.isNew ? undefined : () => setDeleteTopic(topicModal.topic)}
      />}
      <ConfirmDialog
        open={!!deleteSubject}
        title={`حذف درس «${deleteSubject?.name}»؟`}
        message={<>با حذف این درس، <b>{faNum(state.chapters.filter((c) => c.subjectId === deleteSubject?.id).length)} فصل</b>، <b>{faNum(topicCounts.get(deleteSubject?.id ?? '') ?? 0)} مبحث</b> و تمام مرورها، وظایف، تست‌ها و جلسات مرتبط حذف می‌شود. این عمل قابل برگشت نیست.</>}
        confirmText="حذف درس"
        danger
        onConfirm={() => { if (deleteSubject) dispatch({ type: 'DELETE_SUBJECT', id: deleteSubject.id }); setDeleteSubject(null); }}
        onCancel={() => setDeleteSubject(null)}
      />
      <ConfirmDialog
        open={!!deleteChapter}
        title={`حذف فصل «${deleteChapter?.name}»؟`}
        message={<>با حذف این فصل، <b>{faNum(chapterCounts.get(deleteChapter?.id ?? '') ?? 0)} مبحث</b> و مرورها و تست‌های مرتبط حذف می‌شود.</>}
        confirmText="حذف فصل"
        danger
        onConfirm={() => { if (deleteChapter) dispatch({ type: 'DELETE_CHAPTER', id: deleteChapter.id }); setDeleteChapter(null); }}
        onCancel={() => setDeleteChapter(null)}
      />
      <ConfirmDialog
        open={!!deleteTopic}
        title={`حذف مبحث «${deleteTopic?.name}»؟`}
        message="تمام مرورهای برنامه‌ریزی‌شده این مبحث نیز حذف می‌شود. تاریخچه تست و جلسات مرتبط حفظ می‌شود."
        confirmText="حذف مبحث"
        danger
        onConfirm={() => { if (deleteTopic) dispatch({ type: 'DELETE_TOPIC', id: deleteTopic.id }); setDeleteTopic(null); }}
        onCancel={() => setDeleteTopic(null)}
      />

    </div>
  );
}

function emptyTopic(subjectId: string, chapterId: string): Topic {
  return {
    id: '', subjectId, chapterId, name: '',
    pages: null, startPage: null, endPage: null,
    priority: 'medium', difficulty: 'medium',
    studyStatus: 'not_started', mastery: 0,
    correctCount: 0, wrongCount: 0, unansweredCount: 0,
    lastStudyDate: null, lastReviewDate: null, nextReviewDate: null,
    notes: '', resources: '', createdAt: '',
  };
}

/* ---------- ردیف مبحث در حالت فلت ---------- */
function TopicFlatRow({ topic, onOpen }: { topic: Topic; onOpen: () => void }) {
  const { state } = useStore();
  const next = topicNextReview(state, topic.id);
  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <Pill tone={studyStatusTone(topic.studyStatus)}>{studyStatusLabel(topic.studyStatus)}</Pill>
      <button onClick={onOpen} className="flex-1 min-w-0 text-start">
        <div className="font-bold text-sm truncate">{topic.name}</div>
        <div className="text-[10px] text-muted">
          تسلط {faNum(topic.mastery)}٪{next ? ` · مرور بعدی ${formatDate(next, state.settings.calendar)}` : ''}
        </div>
      </button>
      <Pill tone={priorityTone(topic.priority)}>{priorityLabel(topic.priority)}</Pill>
    </div>
  );
}

/* ---------- بلوک فصل ---------- */
function ChapterBlock({ chapter, expanded, onToggle, onEdit, onMove, onDelete, onAddTopic, topics, onOpenTopic }: {
  chapter: Chapter; expanded: boolean; onToggle: () => void; onEdit: () => void;
  onMove: (dir: -1 | 1) => void; onDelete: () => void; onAddTopic: () => void;
  topics: Topic[]; onOpenTopic: (t: Topic) => void;
}) {
  const { state } = useStore();
  const studied = topics.filter((t) =>
    ['initial_done', 'needs_review', 'mastered', 'needs_more_tests'].includes(t.studyStatus)).length;
  return (
    <div>
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-surface-2/60 text-start cursor-pointer">
        {expanded ? <ChevronDown size={15} className="text-muted shrink-0" /> : <ChevronRight size={15} className="text-muted shrink-0" />}
        <Layers size={14} className="text-muted shrink-0" />
        <span className="font-bold text-sm flex-1 truncate">{chapter.name}</span>
        <span className="text-[10px] text-muted shrink-0">{faNum(studied)}/{faNum(topics.length)} مبحث</span>
        <IconButton title="ویرایش فصل" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil size={13} /></IconButton>
        <IconButton title="انتقال" onClick={(e) => { e.stopPropagation(); onMove(-1); }}><ArrowUp size={13} /></IconButton>
        <IconButton title="انتقال" onClick={(e) => { e.stopPropagation(); onMove(1); }}><ArrowDown size={13} /></IconButton>
        <IconButton title="حذف فصل" className="hover:!text-rose" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={13} /></IconButton>
      </div>
      {expanded && (
        <div className="px-4 pb-2 space-y-1">
          {topics.map((t) => {
            const next = topicNextReview(state, t.id);
            return (
              <button
                key={t.id}
                onClick={() => onOpenTopic(t)}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-surface-2 text-start group"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  t.studyStatus === 'mastered' ? 'bg-emerald' :
                  t.studyStatus === 'not_started' ? 'bg-muted/40' : 'bg-sky'}`} />
                <span className="flex-1 min-w-0 text-sm font-semibold truncate">{t.name}</span>
                {next && (
                  <span className="text-[10px] text-muted flex items-center gap-1">
                    <CalendarClock size={10} /> {formatDate(next, state.settings.calendar)}
                  </span>
                )}
                <Pill tone={studyStatusTone(t.studyStatus)}>{studyStatusLabel(t.studyStatus)}</Pill>
                <Pill tone={priorityTone(t.priority)}>{priorityLabel(t.priority)}</Pill>
              </button>
            );
          })}
          {topics.length === 0 && <div className="text-xs text-muted py-1.5 px-2">هنوز مبحثی در این فصل ثبت نشده است.</div>}
          <button onClick={onAddTopic} className="flex items-center gap-1 text-xs font-bold text-brand px-2 py-1.5 hover:bg-brand-soft rounded-lg">
            <Plus size={13} /> افزودن مبحث به این فصل
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- مدال درس ---------- */
function SubjectModal({ subject, onClose, onSave }: {
  subject?: Subject; onClose: () => void;
  onSave: (name: string, color: string) => void;
}) {
  const [name, setName] = useState(subject?.name ?? '');
  const [color, setColor] = useState(subject?.color ?? SUBJECT_COLORS[0]);
  const toast = useToast();
  const save = () => {
    if (!name.trim()) { toast.push('نام درس را وارد کنید', 'error'); return; }
    onSave(name.trim(), color);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={subject ? 'ویرایش درس' : 'افزودن درس جدید'}>
      <div className="space-y-4">
        <Field label="نام درس" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: آناتومی ۱" autoFocus />
        </Field>
        <Field label="رنگ درس">
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-brand scale-110' : ''}`}
                style={{ background: c }}
                aria-label={`رنگ ${c}`}
              />
            ))}
          </div>
        </Field>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button onClick={save}>{subject ? 'ذخیره تغییرات' : 'افزودن درس'}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- مدال فصل ---------- */
function ChapterModal({ subject, onClose, onSave }: {
  subject: Subject; onClose: () => void; onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const toast = useToast();
  return (
    <Modal open onClose={onClose} title={`افزودن فصل به «${subject.name}»`}>
      <Field label="نام فصل" required>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: فصل ۲ — سیستم عصبی" autoFocus />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>انصراف</Button>
        <Button onClick={() => {
          if (!name.trim()) { toast.push('نام فصل را وارد کنید', 'error'); return; }
          onSave(name.trim());
          onClose();
        }}>افزودن فصل</Button>
      </div>
    </Modal>
  );
}

/* ---------- مدال مبحث (ویرایش کامل + ثبت اتمام مطالعه) ---------- */
function TopicModal({ topic, chapterId, isNew, onClose, onDelete }: {
  topic: Topic; chapterId: string; isNew: boolean; onClose: () => void; onDelete?: () => void;
}) {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const [name, setName] = useState(topic.name);
  const [chapter, setChapter] = useState(chapterId);
  const [pages, setPages] = useState(topic.pages != null ? String(topic.pages) : '');
  const [startPage, setStartPage] = useState(topic.startPage != null ? String(topic.startPage) : '');
  const [endPage, setEndPage] = useState(topic.endPage != null ? String(topic.endPage) : '');
  const [priority, setPriority] = useState<Priority>(topic.priority);
  const [difficulty, setDifficulty] = useState<Difficulty>(topic.difficulty);
  const [status, setStatus] = useState<StudyStatus>(topic.studyStatus);
  const [mastery, setMastery] = useState(topic.mastery);
  const [notes, setNotes] = useState(topic.notes);
  const [resources, setResources] = useState(topic.resources);
  // فرم اتمام مطالعه
  const [showCompletion, setShowCompletion] = useState(false);
  const [compDate, setCompDate] = useState(todayISO());
  const [compMinutes, setCompMinutes] = useState('30');
  const [compPages, setCompPages] = useState('');
  const [compSelf, setCompSelf] = useState('3');
  const [compNote, setCompNote] = useState('');
  const [compReview, setCompReview] = useState(true);

  const subjectId = state.chapters.find((c) => c.id === chapter)?.subjectId ?? topic.subjectId;
  const chapters = state.chapters.filter((c) => c.subjectId === subjectId);
  const nextRev = topic.id ? topicNextReview(state, topic.id) : null;
  const testCount = state.tests.filter((x) => x.topicId === topic.id).length;
  const reviewCount = state.reviews.filter((r) => r.topicId === topic.id && r.status === 'done').length;

  const save = () => {
    if (!name.trim()) { toast.push('نام مبحث را وارد کنید', 'error'); return; }
    const pagesNum = pages.trim() ? Math.max(0, Number(pages)) : null;
    const sp = startPage.trim() ? Math.max(0, Number(startPage)) : null;
    const ep = endPage.trim() ? Math.max(0, Number(endPage)) : null;
    if (isNew) {
      const t = newTopic(subjectId, chapter, name, priority, difficulty);
      t.pages = pagesNum; t.startPage = sp; t.endPage = ep;
      t.notes = notes.trim(); t.resources = resources.trim();
      dispatch({ type: 'ADD_TOPIC', topic: t });
      toast.push('مبحث ایجاد شد');
    } else {
      dispatch({
        type: 'UPDATE_TOPIC',
        topic: {
          ...topic, chapterId: chapter, name: name.trim(),
          pages: pagesNum, startPage: sp, endPage: ep,
          priority, difficulty, notes: notes.trim(), resources: resources.trim(),
          mastery,
        },
      });
      if (status !== topic.studyStatus) {
        dispatch({ type: 'SET_STUDY_STATUS', topicId: topic.id, status, date: today });
      }
      if (mastery !== topic.mastery) {
        dispatch({ type: 'SET_MASTERY', topicId: topic.id, mastery });
      }
      toast.push('تغییرات مبحث ذخیره شد');
    }
    onClose();
  };

  const completeStudy = () => {
    if (!isNew && status !== 'initial_done' && status !== 'mastered') {
      toast.push('ابتدا وضعیت «مطالعه اولیه تمام شده» را انتخاب کنید', 'error');
      return;
    }
    const minutes = Math.max(1, Number(compMinutes) || 0);
    dispatch({
      type: 'LOG_SESSION',
      session: {
        id: crypto.randomUUID(),
        subjectId, topicId: topic.id, date: compDate,
        durationMinutes: minutes,
        pagesStudied: compPages.trim() ? Number(compPages) : null,
        selfAssessment: Number(compSelf) || null,
        note: compNote.trim(),
        startedAt: new Date().toISOString(),
      },
    });
    if (!isNew && topic.studyStatus !== 'initial_done') {
      completeInitialStudy(dispatch, topic.id, compDate);
      toast.push('مطالعه اولیه ثبت شد — برنامه مرور ایجاد گردید');
    } else {
      toast.push('جلسه مطالعه ثبت شد');
    }
    if (!compReview) {
      // کاربر نیاز به مرور ندارد → مرورهای معلق آینده را حذف نمی‌کنیم (حفظ داده)،
      // فقط علامت مبحث
      dispatch({ type: 'SET_STUDY_STATUS', topicId: topic.id, status: 'mastered', date: compDate });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'افزودن مبحث جدید' : `مبحث: ${topic.name}`} wide>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="نام مبحث" required>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: استخوان‌های جمجمه" autoFocus />
          </Field>
          <Field label="فصل" required>
            <select className={inputCls} value={chapter} onChange={(e) => setChapter(e.target.value)}>
              {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="تعداد صفحات (اختیاری)">
            <input className={inputCls} type="number" min={0} value={pages} onChange={(e) => setPages(e.target.value)} />
          </Field>
          <Field label="صفحه شروع — پایان (اختیاری)">
            <div className="flex gap-2" dir="ltr">
              <input className={inputCls} type="number" min={0} placeholder="شروع" value={startPage} onChange={(e) => setStartPage(e.target.value)} />
              <input className={inputCls} type="number" min={0} placeholder="پایان" value={endPage} onChange={(e) => setEndPage(e.target.value)} />
            </div>
          </Field>
          <Field label="اولویت">
            <Segmented options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} value={priority} onChange={setPriority} />
          </Field>
          <Field label="دشواری تخمینی">
            <Segmented options={DIFFICULTIES.map((d) => ({ value: d.value, label: d.label }))} value={difficulty} onChange={setDifficulty} />
          </Field>
        </div>

        {!isNew && (
          <>
            <Field label="وضعیت مطالعه">
              <div className="grid grid-cols-2 gap-1.5">
                {STUDY_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setStatus(s.value);
                      if (s.value === 'initial_done') setShowCompletion(true);
                    }}
                    className={`rounded-lg border px-2.5 py-2 text-[11px] font-bold text-start transition-all ${status === s.value ? 'border-brand bg-brand-soft' : 'border-border hover:bg-surface-2'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={`میزان تسلط (${faNum(mastery)}٪) — مستقل از وضعیت مطالعه`}>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} step={5} value={mastery} onChange={(e) => setMastery(Number(e.target.value))} className="flex-1" />
                <span className="text-sm font-extrabold w-12 text-center">{faPct(mastery)}</span>
              </div>
              <span className="field-hint">تسلط با مرورها و خودارزیابی بالا می‌رود؛ صرفاً علامت مطالعه به معنای تسلط نیست.</span>
            </Field>
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="یادداشت شخصی">
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="نکات مهم، خلاصه‌نویسی…" />
          </Field>
          <Field label="منابع">
            <textarea className="textarea" value={resources} onChange={(e) => setResources(e.target.value)} placeholder="مثلاً: جزوه دکتر فلانی، صفحات ۱۲–۳۰" />
          </Field>
        </div>

        {!isNew && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Stat label="آخرین مطالعه" value={topic.lastStudyDate ? formatDate(topic.lastStudyDate, state.settings.calendar) : '—'} />
            <Stat label="آخرین مرور" value={topic.lastReviewDate ? formatDate(topic.lastReviewDate, state.settings.calendar) : '—'} />
            <Stat label="مرور بعدی" value={nextRev ? formatDate(nextRev, state.settings.calendar) : '—'} />
            <Stat label="تست‌ها" value={`${faNum(testCount)} جلسه`} />
          </div>
        )}

        {!isNew && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <CheckCircle2 size={14} className="text-emerald" />
            {faNum(reviewCount)} مرور انجام‌شده · تسلط فعلی {faNum(topic.mastery)}٪
            {suggestReviewDate(topic, state) && !nextRev && (
              <span className="flex items-center gap-1"><Sparkles size={12} /> پیشنهاد مرور بعدی: {formatDate(suggestReviewDate(topic, state)!, state.settings.calendar)}</span>
            )}
          </div>
        )}

        {!isNew && (
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button variant="ghost" onClick={onClose}>انصراف</Button>
            {!showCompletion && (
              <Button variant="secondary" onClick={() => setShowCompletion(true)}><CheckCircle2 size={15} /> ثبت اتمام مطالعه</Button>
            )}
            <Button onClick={save}>ذخیره اطلاعات</Button>
          </div>
        )}
        {isNew && (
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button variant="ghost" onClick={onClose}>انصراف</Button>
            <Button onClick={save}>ایجاد مبحث</Button>
          </div>
        )}
        {!isNew && onDelete && (
          <Button variant="ghost" className="!text-rose w-full sm:w-auto justify-start" onClick={onDelete}>
            <Trash2 size={14} /> حذف این مبحث
          </Button>
        )}
      </div>

      {/* فرم جزئیات اتمام مطالعه */}
      {showCompletion && !isNew && (
        <div className="mt-4 p-4 rounded-xl bg-brand-soft/50 border border-brand/30 space-y-3">
          <div className="font-extrabold text-sm flex items-center gap-2"><FileText size={15} /> جزئیات اتمام مطالعه</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="تاریخ مطالعه" required>
              <input className={inputCls} type="date" value={compDate} onChange={(e) => setCompDate(e.target.value)} />
            </Field>
            <Field label="زمان صرف‌شده (دقیقه)">
              <input className={inputCls} type="number" min={1} value={compMinutes} onChange={(e) => setCompMinutes(e.target.value)} />
            </Field>
            <Field label="صفحات مطالعه‌شده">
              <input className={inputCls} type="number" min={0} value={compPages} onChange={(e) => setCompPages(e.target.value)} />
            </Field>
            <Field label="خودارزیابی (۱ تا ۵)">
              <select className={inputCls} value={compSelf} onChange={(e) => setCompSelf(e.target.value)}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{faNum(n)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="یادداشت جلسه">
            <textarea className="textarea" value={compNote} onChange={(e) => setCompNote(e.target.value)} placeholder="چه چیزی یاد گرفتید؟ چه بخشی سخت بود؟" />
          </Field>
          <label className="switch-row">
            <span className="text-sm flex-1">نیاز به مرور فاصله‌دار دارم (پیشنهاد می‌شود)</span>
            <span className={`switch ${compReview ? 'on' : ''}`} onClick={() => setCompReview(!compReview)}><span className="switch-knob" /></span>
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowCompletion(false)}>بازگشت</Button>
            <Button onClick={completeStudy}><CheckCircle2 size={15} /> ثبت اتمام مطالعه</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <div className="text-[10px] text-muted font-bold mb-0.5">{label}</div>
      <div className="text-[11px] font-extrabold">{value}</div>
    </div>
  );
}
