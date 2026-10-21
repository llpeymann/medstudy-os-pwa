/* ============ صفحه تنظیمات و پشتیبان‌گیری ============ */
import React, { useMemo, useRef, useState } from 'react';
import {
  Settings as SettingsIcon, Download, Upload, Trash2, Database,
  CheckCircle2, AlertTriangle, Info, Sparkles,
} from 'lucide-react';
import { useStore, DEFAULT_SETTINGS } from '../state/store';
import { buildBackup, validateBackup, downloadJSON, summarizeBackup, type BackupSummary } from '../lib/backup';
import { toJalaali, isValidJalaaliDate } from '../lib/jalaali';
import { fromJalaaliToISO, formatDate, todayISO } from '../lib/dates';
import { faNum } from '../lib/format';
import { storageBackend, clearAll } from '../lib/db';
import {
  Card, CardHeader, Button, Field, inputCls, Segmented, Switch, Modal,
  ConfirmDialog, useToast,
} from '../components/ui';
import type { ThemeMode, CalendarMode } from '../types';

export default function Settings() {
  const { state, dispatch, backend } = useStore();
  const toast = useToast();
  const s = state.settings;
  const fileRef = useRef<HTMLInputElement>(null);

  // ویرایشگر فاصله‌های مرور
  const [intervalsText, setIntervalsText] = useState(s.reviewIntervals.join(', '));
  // تاریخ آزمون — ورودی شمسی
  const examJ = useMemo(() => (s.examDate ? toJalaali(new Date(s.examDate + 'T12:00:00').getFullYear(), new Date(s.examDate + 'T12:00:00').getMonth() + 1, new Date(s.examDate + 'T12:00:00').getDate()) : null), [s.examDate]);
  const [ejY, setEjY] = useState(examJ ? String(examJ.jy) : '');
  const [ejM, setEjM] = useState(examJ ? String(examJ.jm) : '');
  const [ejD, setEjD] = useState(examJ ? String(examJ.jd) : '');
  // همگام‌سازی ورودی با تغییر تنظیمات از بیرون
  React.useEffect(() => {
    const j = s.examDate ? toJalaali(...gregParts(s.examDate)) : null;
    setEjY(j ? String(j.jy) : '');
    setEjM(j ? String(j.jm) : '');
    setEjD(j ? String(j.jd) : '');
  }, [s.examDate]);

  const [importSummary, setImportSummary] = useState<BackupSummary | null>(null);
  const [importRaw, setImportRaw] = useState<string | null>(null);
  const [clearStep, setClearStep] = useState(0);
  const [clearText, setClearText] = useState('');

  const update = (patch: Partial<typeof s>) => dispatch({ type: 'UPDATE_SETTINGS', settings: patch });

  const saveIntervals = () => {
    const nums = intervalsText.split(/[,،\s]+/).map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length < 2) { toast.push('حداقل دو فاصله معتبر وارد کنید (مثلاً: ۱، ۳، ۷، ۱۴)', 'error'); return; }
    update({ reviewIntervals: nums.slice(0, 12).map(Math.round) });
    toast.push('الگوی مرور ذخیره شد');
  };

  const saveExamDate = () => {
    const y = Number(ejY), m = Number(ejM), d = Number(ejD);
    if (!ejY || !ejM || !ejD) { update({ examDate: null }); toast.push('تاریخ آزمون پاک شد', 'info'); return; }
    if (!isValidJalaaliDate(y, m, d)) { toast.push('تاریخ شمسی معتبر نیست', 'error'); return; }
    const iso = fromJalaaliToISO(y, m, d);
    if (!iso) { toast.push('تاریخ قابل تبدیل نیست', 'error'); return; }
    update({ examDate: iso });
    toast.push('تاریخ آزمون ذخیره شد — شمارش معکوس به‌روز شد');
  };

  const exportBackup = () => {
    const name = `medstudy-os-backup-${todayISO()}.json`;
    downloadJSON(name, buildBackup(state));
    toast.push('فایل پشتیبان دانلود شد');
  };

  const onImportFile = async (f: File) => {
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      const check = validateBackup(parsed);
      if (!check.ok) { toast.push(check.error, 'error'); return; }
      setImportRaw(text);
      setImportSummary(check.summary);
    } catch {
      toast.push('فایل JSON خوانده نشد — فایل نامعتبر است', 'error');
    }
  };

  const doImport = () => {
    if (!importRaw) return;
    try {
      const parsed = JSON.parse(importRaw);
      const check = validateBackup(parsed);
      if (!check.ok) { toast.push(check.error, 'error'); return; }
      dispatch({ type: 'IMPORT_STATE', state: parsed.data });
      setImportRaw(null); setImportSummary(null);
      toast.push('نسخه پشتیبان بازیابی شد');
    } catch {
      toast.push('خطا در پردازش فایل', 'error');
    }
  };

  const doClear = async () => {
    await clearAll();
    dispatch({ type: 'RESET' });
    setClearStep(0); setClearText('');
    toast.push('تمام داده‌ها پاک شد', 'info');
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 fade-up">
      {/* عمومی */}
      <Card>
        <CardHeader title="عمومی" subtitle="نام اپلیکیشن و تاریخ آزمون" />
        <div className="px-4 pb-4 space-y-4">
          <Field label="نام اپلیکیشن" required>
            <input className={inputCls} value={s.appName} onChange={(e) => update({ appName: e.target.value })} maxLength={40} />
          </Field>
          <Field label="تاریخ آزمون (شمسی)" hint="برای حذف، هر سه فیلد را خالی گذاشته و ذخیره کنید">
            <div className="grid grid-cols-3 gap-2" dir="rtl">
              <select className={inputCls} value={ejY} onChange={(e) => setEjY(e.target.value)}>
                <option value="">سال</option>
                {Array.from({ length: 41 }, (_, i) => 1380 + i).map((y) => <option key={y} value={y}>{faNum(y)}</option>)}
              </select>
              <select className={inputCls} value={ejM} onChange={(e) => setEjM(e.target.value)}>
                <option value="">ماه</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{faNum(m)}</option>)}
              </select>
              <select className={inputCls} value={ejD} onChange={(e) => setEjD(e.target.value)}>
                <option value="">روز</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{faNum(d)}</option>)}
              </select>
            </div>
            <div className="field-hint">
              {s.examDate ? `میلادی معادل: ${formatDate(s.examDate, 'gregorian')}` : 'ثبت نشده'}
            </div>
          </Field>
          <Button size="sm" onClick={saveExamDate}>ذخیره تاریخ آزمون</Button>
        </div>
      </Card>

      {/* ظاهر و نمایش */}
      <Card>
        <CardHeader title="ظاهر و نمایش" />
        <div className="px-4 pb-4 space-y-4">
          <Field label="تم روز / شب" hint="پس از بستن و بازکردن برنامه باقی می‌ماند">
            <Segmented
              options={[
                { value: 'light', label: '☀️ روز' },
                { value: 'dark', label: '🌙 شب' },
                { value: 'system', label: '💻 سیستم' },
              ]}
              value={s.theme}
              onChange={(v) => update({ theme: v as ThemeMode })}
            />
          </Field>
          <Field label="تقویم پیش‌فرض">
            <Segmented
              options={[{ value: 'jalali', label: 'شمسی' }, { value: 'gregorian', label: 'میلادی' }]}
              value={s.calendar}
              onChange={(v) => update({ calendar: v as CalendarMode })}
            />
          </Field>
          <Field label={`آستانه تسلط مناسب (${faNum(s.masteredThreshold)}٪)`}>
            <input type="range" min={40} max={100} step={5} value={s.masteredThreshold} onChange={(e) => update({ masteredThreshold: Number(e.target.value) })} className="w-full" />
          </Field>
          <Switch checked={s.chartsEnabled} onChange={(v) => update({ chartsEnabled: v })} label="نمایش نمودارها در داشبورد و گزارش" />
          <Switch checked={s.notificationsEnabled} onChange={(v) => update({ notificationsEnabled: v })} label="اعلان‌های درون‌برنامه (مرورهای موعدرسیده)" />
          <p className="text-[11px] text-muted leading-5 flex gap-1.5">
            <Info size={13} className="shrink-0 mt-0.5" />
            اعلان‌های فوری مرورگر (Push) در نسخه آفلاین تک‌دستگاهی پشتیبانی نمی‌شود؛
            اعلان‌ها به‌صورت درون‌برنامه و هنگام بازکردن اپلیکیشن نمایش داده می‌شوند.
          </p>
        </div>
      </Card>

      {/* برنامه‌ریزی */}
      <Card>
        <CardHeader title="برنامه‌ریزی و مرور فاصله‌دار" subtitle="فاصله‌ها پیشنهادی هستند، نه قانون علمی قطعی" />
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NumberField label="روز مطالعه/هفته" value={s.studyDaysPerWeek} min={1} max={7} onChange={(v) => update({ studyDaysPerWeek: v })} />
            <NumberField label="سقف وظایف روزانه" value={s.dailyTaskCap} min={1} max={40} onChange={(v) => update({ dailyTaskCap: v })} />
            <NumberField label="هدف زمانی روزانه (دقیقه)" value={s.dailyGoalMinutes} min={10} max={900} step={10} onChange={(v) => update({ dailyGoalMinutes: v })} />
            <NumberField label="آستانه تسلط (٪)" value={s.masteredThreshold} min={0} max={100} onChange={(v) => update({ masteredThreshold: v })} />
          </div>
          <Field label="فاصله‌های مرور (روز)" hint="مثلاً: 1, 3, 7, 14, 30 — مرور اول یک روز بعد، دوم سه روز بعد و…">
            <input className={inputCls} value={intervalsText} onChange={(e) => setIntervalsText(e.target.value)} dir="ltr" style={{ textAlign: 'left' }} />
          </Field>
          <Button size="sm" variant="secondary" onClick={saveIntervals}>ذخیره الگوی مرور</Button>
          <Button size="xs" variant="ghost" onClick={() => { setIntervalsText(DEFAULT_SETTINGS.reviewIntervals.join(', ')); update({ reviewIntervals: DEFAULT_SETTINGS.reviewIntervals }); }}>
            بازگرداندن پیش‌فرض
          </Button>
        </div>
      </Card>

      {/* ذخیره‌سازی و پشتیبان‌گیری */}
      <Card>
        <CardHeader title="ذخیره‌سازی و پشتیبان‌گیری" subtitle={`محرک فعال: ${backend === 'idb' ? 'IndexedDB' : backend === 'local' ? 'حافظه محلی مرورگر' : 'ناموجود'}`} />
        <div className="px-4 pb-4 space-y-3">
          <div className="note-row text-xs">
            <Database size={15} className="text-brand shrink-0" />
            <span className="flex-1 leading-5">
              تمام داده‌ها فقط روی <b>همین دستگاه</b> و در فضای اختصاصی همین مرورگر ذخیره می‌شوند.
              هیچ اطلاعاتی به سرور یا سرویس خارجی ارسال نمی‌شود. پاک‌کردن داده‌های سایت می‌تواند اطلاعات را حذف کند؛ منظم نسخه پشتیبان JSON بگیرید.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportBackup}><Download size={15} /> تهیه نسخه پشتیبان (JSON)</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> بازیابی نسخه پشتیبان</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <MiniStat label="دروس" value={state.subjects.length} />
            <MiniStat label="مباحث" value={state.topics.length} />
            <MiniStat label="مرورها" value={state.reviews.length} />
            <MiniStat label="جلسات" value={state.sessions.length} />
          </div>
        </div>
      </Card>

      {/* خطرناک */}
      <Card className="!border-rose/40">
        <CardHeader title="منطقه خطر" subtitle="عملیات برگشت‌ناپذیر" />
        <div className="px-4 pb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => { dispatch({ type: 'SEED_DEMO' }); toast.push('داده نمونه (آزمایشی) بارگذاری شد — از داده واقعی تفکیک شده است', 'info'); }}>
              <Sparkles size={15} /> بارگذاری داده نمونه
            </Button>
            <Button variant="danger" onClick={() => setClearStep(1)}><Trash2 size={15} /> پاک‌سازی همه داده‌ها</Button>
          </div>
          <p className="text-[11px] text-muted">«داده نمونه» فقط جهت آشنایی با اپلیکیشن است و هرگز به‌عنوان داده واقعی شما نمایش داده نمی‌شود.</p>
        </div>
      </Card>

      {/* درباره */}
      <Card className="p-4 text-xs text-muted leading-6">
        <b className="text-ink">{s.appName}</b> — سیستم مدیریت هوشمند مطالعه پزشکی.<br />
        نسخه ۱.۰.۰ · کاملاً آفلاین · بدون حساب کاربری · بدون ارسال داده به خارج.<br />
        الگوریتم مرور فاصله‌دار: فاصله‌های پیشنهادی قابل تنظیم (پیش‌فرض ۱/۳/۷/۱۴ روز) با تنظیم بر اساس نتیجه هر مرور.
      </Card>

      {/* مدال خلاصه واردات */}
      <Modal open={!!importSummary} onClose={() => { setImportSummary(null); setImportRaw(null); }} title="خلاصه نسخه پشتیبان">
        {importSummary && (
          <div className="space-y-3">
            <div className="note-row text-xs"><span>تاریخ خروجی:</span><b>{formatDate(importSummary.exportedAt.slice(0, 10), s.calendar, true)}</b></div>
            <div className="note-row text-xs"><span>نسخه فایل:</span><b>{faNum(importSummary.version)}</b></div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <MiniStat label="دروس" value={importSummary.subjects} />
              <MiniStat label="فصل‌ها" value={importSummary.chapters} />
              <MiniStat label="مباحث" value={importSummary.topics} />
              <MiniStat label="مرورها" value={importSummary.reviews} />
              <MiniStat label="وظایف" value={importSummary.tasks} />
              <MiniStat label="تست‌ها" value={importSummary.tests} />
              <MiniStat label="اشتباهات" value={importSummary.mistakes} />
              <MiniStat label="جلسات" value={importSummary.sessions} />
            </div>
            <div className="note-row !border-amber/40 text-amber text-xs">
              <AlertTriangle size={14} />
              واردکردن، <b>تمام داده‌های فعلی را جایگزین</b> می‌کند. قبل از آن نسخه پشتیبان بگیرید.
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setImportSummary(null); setImportRaw(null); }}>انصراف</Button>
              <Button onClick={doImport}><CheckCircle2 size={15} /> جایگزینی و بازیابی</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* پاک‌سازی چندمرحله‌ای */}
      <ConfirmDialog
        open={clearStep === 1}
        title="پاک‌سازی همه داده‌ها — مرحله ۱ از ۲"
        message="تمام دروس، مباحث، مرورها، تست‌ها، جلسات و تنظیمات پاک می‌شود. آیا مطمئن هستید؟"
        confirmText="مرحله بعد"
        danger
        onConfirm={() => setClearStep(2)}
        onCancel={() => setClearStep(0)}
      />
      <Modal open={clearStep === 2} onClose={() => setClearStep(0)} title="پاک‌سازی — مرحله ۲ از ۲">
        <p className="text-sm text-muted leading-6 mb-3">
          برای تأیید نهایی، کلمه <b className="text-rose">حذف</b> را در کادر زیر تایپ کنید.
        </p>
        <input className={inputCls} value={clearText} onChange={(e) => setClearText(e.target.value)} placeholder="حذف" />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={() => setClearStep(0)}>انصراف</Button>
          <Button variant="danger" disabled={clearText.trim() !== 'حذف'} onClick={doClear}><Trash2 size={15} /> پاک‌سازی نهایی</Button>
        </div>
      </Modal>
    </div>
  );
}

function gregParts(iso: string): [number, number, number] {
  const d = new Date(iso + 'T12:00:00');
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

function NumberField({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        className={inputCls} type="number" min={min} max={max} step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
      />
    </Field>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2.5">
      <div className="text-base font-extrabold timer-digit">{faNum(value)}</div>
      <div className="text-[10px] text-muted font-bold mt-0.5">{label}</div>
    </div>
  );
}
