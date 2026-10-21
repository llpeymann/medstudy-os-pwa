/* ============ صفحه تقویم مطالعاتی ============ */
import React, { useMemo, useState } from 'react';
import { Plus, MoonStar, CalendarDays, ListTodo } from 'lucide-react';
import { useStore, newTask } from '../state/store';
import { todayISO, formatDate, currentMonthStart } from '../lib/dates';
import { Card, CardHeader, Button, Pill, EmptyState, Modal, Field, inputCls, Segmented, useToast } from '../components/ui';
import CalendarView, { type DayItem } from '../components/CalendarView';
import { useLookups } from '../lib/lookups';
import type { CalendarMode, TaskType } from '../types';

export default function CalendarPage() {
  const { state, dispatch, today } = useStore();
  const toast = useToast();
  const L = useLookups(state);
  const start = currentMonthStart(state.settings.calendar);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [ym, setYm] = useState({ year: start.year, month: start.month });
  const [selected, setSelected] = useState(today);
  const [addTaskFor, setAddTaskFor] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('study');

  const items = useMemo(() => {
    const map: Record<string, DayItem> = {};
    const bump = (iso: string, key: keyof DayItem, n = 1) => {
      if (!map[iso]) map[iso] = { study: 0, tasks: 0, reviews: 0, tests: 0, rest: false, overdue: 0 };
      (map[iso] as never as Record<string, number>)[key] += n;
    };
    for (const s of state.sessions) bump(s.date, 'study');
    for (const t of state.tasks) {
      bump(t.date, 'tasks');
      if (!t.done && t.date < today) bump(t.date, 'overdue');
    }
    for (const r of state.reviews) {
      if (r.status === 'pending') bump(r.scheduledDate, 'reviews');
    }
    for (const t of state.tests) bump(t.date, 'tests');
    for (const rd of state.restDays) {
      if (!map[rd.date]) map[rd.date] = { study: 0, tasks: 0, reviews: 0, tests: 0, rest: false, overdue: 0 };
      map[rd.date].rest = true;
    }
    return map;
  }, [state, today]);

  const shiftMonth = (dir: -1 | 1) => {
    let { year, month } = ym;
    month += dir;
    if (month > 12) { month = 1; year++; }
    if (month < 1) { month = 12; year--; }
    setYm({ year, month });
  };

  const selItems = items[selected];
  const selRest = state.restDays.find((r) => r.date === selected);
  const selTasks = state.tasks.filter((t) => t.date === selected).sort((a, b) => Number(a.done) - Number(b.done));
  const selReviews = state.reviews.filter((r) => r.status === 'pending' && r.scheduledDate === selected);
  const selSessions = state.sessions.filter((s) => s.date === selected);
  const selTests = state.tests.filter((t) => t.date === selected);
  const isRest = !!selRest;

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) { toast.push('عنوان وظیفه را وارد کنید', 'error'); return; }
    dispatch({ type: 'ADD_TASK', task: newTask(addTaskFor ?? selected, taskTitle, taskType, null, null) });
    setTaskTitle(''); setTaskType('study'); setAddTaskFor(null);
    toast.push(`وظیفه برای ${formatDate(selected, state.settings.calendar)} اضافه شد`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented options={[{ value: 'month', label: 'نمای ماهانه' }, { value: 'week', label: 'نمای هفتگی' }]} value={view} onChange={(v) => setView(v as 'month' | 'week')} />
        <Pill tone="gray">{state.settings.calendar === 'jalali' ? 'تقویم شمسی' : 'تقویم میلادی'}</Pill>
      </div>

      {view === 'month' ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CalendarView
              year={ym.year}
              month={ym.month}
              calendar={state.settings.calendar}
              items={items}
              selected={selected}
              onSelect={setSelected}
              onPrev={() => shiftMonth(1)}
              onNext={() => shiftMonth(-1)}
              examDate={state.settings.examDate}
            />
          </div>
          <div className="space-y-4">
            {/* جزئیات روز انتخاب‌شده */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-sm">{formatDate(selected, state.settings.calendar, true)}</div>
                <Button variant={isRest ? 'soft' : 'ghost'} size="xs" onClick={() => { dispatch({ type: 'TOGGLE_REST_DAY', date: selected }); }}>
                  <MoonStar size={13} /> {isRest ? 'لغو استراحت' : 'روز استراحت'}
                </Button>
              </div>
              {selected === today && <Pill tone="teal" className="mb-2">امروز</Pill>}
              <div className="space-y-2">
                {selReviews.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-violet mb-1">مرورهای موعدرسیده ({selReviews.length})</div>
                    {selReviews.slice(0, 4).map((r) => (
                      <div key={r.id} className="note-row !py-1.5 text-xs mb-1">
                        <span className="flex-1 truncate">{L.topicById.get(r.topicId)?.name ?? '—'}</span>
                        <span className="text-[10px]">مرور {formatDate(r.scheduledDate, state.settings.calendar, false)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selTasks.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-amber mb-1">وظایف ({selTasks.length})</div>
                    {selTasks.slice(0, 5).map((t) => (
                      <div key={t.id} className="note-row !py-1.5 text-xs mb-1">
                        <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'TOGGLE_TASK', id: t.id, today })} className="w-3.5 h-3.5" />
                        <span className={`flex-1 truncate ${t.done ? 'line-through opacity-60' : ''}`}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selSessions.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-sky mb-1">جلسات مطالعه ({selSessions.length})</div>
                    {selSessions.slice(0, 4).map((s) => (
                      <div key={s.id} className="note-row !py-1.5 text-xs mb-1">
                        <span className="flex-1 truncate">{L.topicById.get(s.topicId ?? '')?.name ?? L.subjectById.get(s.subjectId ?? '')?.name ?? 'مطالعه عمومی'}</span>
                        <span className="text-[10px]">{s.durationMinutes} دقیقه</span>
                      </div>
                    ))}
                  </div>
                )}
                {selTests.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-emerald mb-1">تست‌ها ({selTests.length})</div>
                    {selTests.slice(0, 3).map((t) => (
                      <div key={t.id} className="note-row !py-1.5 text-xs mb-1">
                        <span className="flex-1 truncate">{t.source || 'جلسه تست'}</span>
                        <span className="text-[10px]">{t.correct}/{t.total}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!selItems || (selItems.study + selItems.tasks + selItems.reviews + selItems.tests === 0 && !selItems.rest) ? (
                  <EmptyState icon={<CalendarDays size={22} />} title="بدون برنامه" message="برای این روز هیچ فعالیتی ثبت نشده است." />
                ) : null}
              </div>
              <Button variant="soft" size="xs" className="w-full mt-3" onClick={() => setAddTaskFor(selected)}>
                <Plus size={13} /> افزودن وظیفه برای این روز
              </Button>
            </Card>
          </div>
        </div>
      ) : (
        /* نمای هفتگی */
        <WeekView todayISO={today} weekStart={selected} items={items} onSelect={setSelected} calendar={state.settings.calendar} />
      )}

      {/* مدال افزودن وظیفه */}
      <Modal open={!!addTaskFor} onClose={() => setAddTaskFor(null)} title={`افزودن وظیفه — ${formatDate(addTaskFor ?? selected, state.settings.calendar)}`}>
        <form onSubmit={addTask} className="space-y-3">
          <Field label="عنوان وظیفه" required>
            <input className={inputCls} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="مثلاً: مرور فصل ۴" autoFocus />
          </Field>
          <Field label="نوع وظیفه">
            <Segmented
              options={[{ value: 'study', label: 'مطالعه' }, { value: 'review', label: 'مرور' }, { value: 'test', label: 'تست' }, { value: 'custom', label: 'سفارشی' }]}
              value={taskType}
              onChange={setTaskType}
            />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setAddTaskFor(null)}>انصراف</Button>
            <Button type="submit"><ListTodo size={14} /> ثبت وظیفه</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------- نمای هفتگی ---------- */
function WeekView({ todayISO, weekStart, items, onSelect, calendar }: {
  todayISO: string; weekStart: string; items: Record<string, DayItem>;
  onSelect: (iso: string) => void; calendar: CalendarMode;
}) {
  const days = useMemo(() => {
    const d = new Date(weekStart + 'T12:00:00');
    const start = (d.getDay() + 1) % 7; // فاصله از شنبه
    const arr: string[] = [];
    for (let i = -start; i < 7 - start; i++) {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + i);
      arr.push(nd.toISOString().slice(0, 10));
    }
    return arr;
  }, [weekStart]);
  const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  return (
    <Card>
      <CardHeader title="برنامه هفتگی" subtitle={`${formatDate(days[0], calendar)} تا ${formatDate(days[6], calendar)}`} />
      <div className="px-4 pb-4 grid grid-cols-7 gap-1.5">
        {days.map((iso, i) => {
          const it = items[iso];
          const d = new Date(iso + 'T12:00:00');
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              className={`rounded-xl border p-2 text-center transition-all min-h-24 ${iso === todayISO ? 'border-brand bg-brand-soft' : 'border-border hover:bg-surface-2'}`}
            >
              <div className="text-[10px] font-bold text-muted">{weekdays[i]}</div>
              <div className="text-sm font-extrabold">{d.getDate()}</div>
              <div className="mt-1 space-y-0.5 text-[9px] font-bold">
                {it?.study ? <div className="text-sky">مطالعه {it.study}</div> : null}
                {it?.reviews ? <div className="text-violet">مرور {it.reviews}</div> : null}
                {it?.tasks ? <div className="text-amber">وظیفه {it.tasks}</div> : null}
                {it?.tests ? <div className="text-emerald">تست {it.tests}</div> : null}
                {it?.rest ? <div className="text-muted">استراحت</div> : null}
                {it?.overdue ? <div className="text-rose">عقب‌افتاده {it.overdue}</div> : null}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
