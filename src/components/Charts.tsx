/* ============ نمودارهای SVG اختصاصی — بدون وابستگی، تم‌پذیر ============ */
import { faNum } from '../lib/format';

/** نمودار میله‌ای افقی (مناسب RTL) */
export function HBars({ data, max }: { data: { label: string; value: number; color?: string }[]; max?: number }) {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-28 shrink-0 text-[11px] font-semibold text-muted truncate">{d.label}</div>
          <div className="flex-1 h-5 rounded-md bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{ width: `${Math.max(d.value > 0 ? 3 : 0, (d.value / peak) * 100)}%`, background: d.color ?? 'var(--brand)' }}
            />
          </div>
          <div className="w-10 text-start text-[11px] font-bold">{faNum(d.value)}</div>
        </div>
      ))}
    </div>
  );
}

/** نمودار ستونی فعالیت هفتگی */
export function BarChart({ data, height = 150, color = 'var(--brand)' }: {
  data: { label: string; value: number }[]; height?: number; color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 100, H = 100;
  const bw = data.length ? (W / data.length) * 0.55 : 0;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" style={{ height }} role="img" aria-label="نمودار فعالیت هفتگی">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * (1 - f)} y2={H * (1 - f)} stroke="var(--ring)" strokeWidth="0.25" strokeDasharray="2 3" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - 8);
          const x = (W / data.length) * i + ((W / data.length) - bw) / 2;
          return (
            <g key={i}>
              <rect x={x} y={H - h} width={bw} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="2" fill={color} opacity={d.value > 0 ? 0.92 : 0.15} />
              <text x={x + bw / 2} y={H + 7} textAnchor="middle" fontSize="4.2" fill="var(--muted)">{d.label}</text>
              {d.value > 0 && (
                <text x={x + bw / 2} y={H - h - 2} textAnchor="middle" fontSize="4" fontWeight="700" fill="var(--ink-soft)">{faNum(d.value)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** نمودار خطی روند */
export function LineChart({ data, height = 140, color = 'var(--sky)' }: {
  data: { label: string; value: number }[]; height?: number; color?: string;
}) {
  if (data.length === 0) return null;
  const W = 100, H = 100;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const px = (i: number) => (data.length === 1 ? 50 : (i / (data.length - 1)) * (W - 10) + 5);
  const py = (v: number) => H - ((v - min) / span) * (H - 14) - 4;
  const pts = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" style={{ height }} role="img" aria-label="روند">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--ring)" strokeWidth="0.25" strokeDasharray="2 3" />
        ))}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(d.value)} r="1.6" fill={color} />
            <text x={px(i)} y={H + 7} textAnchor="middle" fontSize="3.8" fill="var(--muted)">{d.label}</text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted mt-1 px-1">
        <span>کمینه: {faNum(min)}٪</span>
        <span>بیشینه: {faNum(max)}٪</span>
      </div>
    </div>
  );
}

/** چرخه روز / شب برای شمارش معکوس */
export function CountdownRing({ days, total }: { days: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (days / total) * 100)) : 0;
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="w-full max-w-[180px]">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--ring)" strokeWidth="9" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--brand)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset .6s' }} />
    </svg>
  );
}
