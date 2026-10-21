/* ============ مجموعه اجزای UI مشترک ============ */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

/* ---------- Toast ---------- */
interface Toast { id: string; kind: 'success' | 'error' | 'info'; text: string }
interface ToastCtx { push: (text: string, kind?: Toast['kind']) => void; }
const ToastContext = createContext<ToastCtx>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = String(Date.now() + Math.random());
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 items-center pointer-events-none w-full px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind} pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium`}>
            {t.kind === 'success' && <CheckCircle2 size={16} />}
            {t.kind === 'error' && <AlertTriangle size={16} />}
            {t.kind === 'info' && <Info size={16} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- دکمه ---------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type BtnSize = 'sm' | 'md' | 'xs';
export function Button({
  variant = 'primary', size = 'md', className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  title, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <button title={title} aria-label={title} className={`icon-btn ${className}`} {...props} />
  );
}

/* ---------- کارت ---------- */
export function Card({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- فرم ---------- */
export function Field({ label, hint, error, children, required }: {
  label: string; hint?: string; error?: string | null; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export const inputCls = 'input';

/* ---------- مدال ---------- */
export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={`relative card w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl modal-sheet`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-base font-bold">{title}</h3>
          <IconButton title="بستن" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmText = 'تأیید', danger, onConfirm, onCancel }: {
  open: boolean; title: string; message: React.ReactNode; confirmText?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div className="relative card max-w-sm w-full p-5 modal-sheet">
        <h3 className="font-bold text-base mb-2">{title}</h3>
        <div className="text-sm text-muted leading-6 mb-5">{message}</div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel}>انصراف</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- نشانگرها ---------- */
const toneMap: Record<string, string> = {
  sky: 'tone-sky', emerald: 'tone-emerald', amber: 'tone-amber',
  rose: 'tone-rose', violet: 'tone-violet', gray: 'tone-gray', teal: 'tone-teal', indigo: 'tone-indigo',
};
export function Pill({ tone = 'gray', children, title, className = '' }: { tone?: string; children: React.ReactNode; title?: string; className?: string }) {
  return <span title={title} className={`pill ${toneMap[tone] ?? 'tone-gray'} ${className}`}>{children}</span>;
}

export function EmptyState({ icon, title, message, action }: {
  icon: React.ReactNode; title: string; message?: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {message && <div className="empty-message">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Loader2 size={28} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ProgressBar({ value, color = 'var(--brand)', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-surface-2 overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

/** حلقه پیشرفت دایره‌ای */
export function Donut({ value, size = 120, stroke = 10, color = 'var(--brand)', children }: {
  value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** جابه‌جایی بازگشتی */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`segmented-item ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** کلید روشن/خاموش */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch-row" onClick={() => onChange(!checked)}>
      {label && <span className="text-sm flex-1">{label}</span>}
      <span className={`switch ${checked ? 'on' : ''}`}>
        <span className="switch-knob" />
      </span>
    </button>
  );
}

/** جدول سازگار با موبایل */
export function DataTable({ columns, rows, empty, onRowClick }: {
  columns: { key: string; title: string; className?: string }[];
  rows: React.ReactNode[][];
  empty?: React.ReactNode;
  onRowClick?: (rowIndex: number) => void;
}) {
  if (!rows.length) return <>{empty ?? null}</>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} onClick={onRowClick ? () => onRowClick(i) : undefined} className={onRowClick ? 'cursor-pointer' : ''}>
              {r.map((cell, j) => <td key={j} className={columns[j]?.className}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** پنل جانبی موبایل */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 top-14 card !rounded-none !border-x-0 !border-b-0 overflow-y-auto sheet-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{title}</h3>
          <IconButton title="بستن" onClick={onClose}><X size={18} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useFirstMountedRef() {
  return useRef(false);
}

export { useCallback as _useCallback };
