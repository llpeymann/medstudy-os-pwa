/* ============ فرم ثبت نتیجه مرور (مشترک) ============ */
import React, { useState } from 'react';
import { useStore } from '../state/store';
import { Button, Field, inputCls, Modal } from './ui';
import { faNum } from '../lib/format';
import type { ReviewEntry, ReviewResult } from '../types';

export const REVIEW_RESULTS: { value: ReviewResult; label: string; desc: string }[] = [
  { value: 'good', label: 'خوب', desc: 'کامل یادآوری شد' },
  { value: 'ok', label: 'متوسط', desc: 'بخشی یادآوری شد' },
  { value: 'poor', label: 'ضعیف', desc: 'بیشترش فراموش شده' },
  { value: 'forgotten', label: 'فراموش شده', desc: 'تقریباً هیچی یاد نیست' },
];

export default function ReviewForm({ review, onClose }: { review: ReviewEntry; onClose: () => void }) {
  const { dispatch, state } = useStore();
  const [result, setResult] = useState<ReviewResult>('good');
  const [mastery, setMastery] = useState(state.settings.masteredThreshold);
  const [duration, setDuration] = useState(15);
  const [again, setAgain] = useState(false);
  const [notes, setNotes] = useState('');

  const nextNumber = result === 'poor' || result === 'forgotten'
    ? Math.max(1, review.reviewNumber - 1)
    : review.reviewNumber + 1;
  const interval = (result === 'poor' || result === 'forgotten')
    ? 1
    : state.settings.reviewIntervals[Math.min(nextNumber, state.settings.reviewIntervals.length - 1)];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'COMPLETE_REVIEW',
      id: review.id,
      result,
      mastery,
      durationMinutes: Math.max(1, duration),
      needsReviewAgain: again,
      errorNotes: notes.trim(),
      doneDate: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`ثبت نتیجه مرور ${faNum(review.reviewNumber)}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نتیجه مرور" required>
          <div className="grid grid-cols-2 gap-2">
            {REVIEW_RESULTS.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => setResult(r.value)}
                className={`rounded-xl border p-2.5 text-start transition-all ${result === r.value ? 'border-brand bg-brand-soft' : 'border-border hover:bg-surface-2'}`}
              >
                <div className="text-sm font-bold">{r.label}</div>
                <div className="text-[10px] text-muted">{r.desc}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label={`میزان تسلط پس از مرور (${faNum(mastery)}٪)`}>
          <input type="range" min={0} max={100} step={5} value={mastery} onChange={(e) => setMastery(Number(e.target.value))} className="w-full" />
        </Field>

        <Field label="مدت مرور (دقیقه)" required>
          <input className={inputCls} type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} />
        </Field>

        <label className="switch-row">
          <span className="text-sm flex-1">پس از این مرور، نیاز به مرور مجدد فوری دارم</span>
          <span className={`switch ${again ? 'on' : ''}`}><span className="switch-knob" /></span>
        </label>

        <Field label="یادداشت اشتباهات (اختیاری)">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="نکاتی که فراموش شده یا گیج‌کننده بود…" />
        </Field>

        <div className="note-row !bg-brand-soft text-brand-ink text-xs">
          مرور بعدی پیشنهادی: {result === 'poor' || result === 'forgotten' ? '۱ روز دیگر' : `${faNum(interval)} روز دیگر`} — بر اساس نتیجه و تنظیمات شما
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
          <Button type="submit">ثبت مرور</Button>
        </div>
      </form>
    </Modal>
  );
}
