import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import dayjs from '../../utils/dayjs.js';
import { Skeleton } from '../ui/Skeleton.jsx';

/**
 * Vùng tham khảo WHO (xấp xỉ, -2SD / trung vị / +2SD) theo tháng tuổi 12–72.
 * Nguồn: WHO Child Growth Standards (làm tròn). Chỉ để tham khảo, không thay chẩn đoán.
 */
const WHO = {
  male: {
    weight: { 12: [7.7, 9.6, 12.0], 18: [8.8, 10.9, 13.7], 24: [9.7, 12.2, 15.3], 36: [11.3, 14.3, 18.3], 48: [12.7, 16.3, 21.2], 60: [14.1, 18.3, 24.2], 72: [15.3, 20.5, 27.1] },
    height: { 12: [71.0, 75.7, 80.5], 18: [76.9, 82.3, 87.7], 24: [81.0, 87.1, 93.2], 36: [88.7, 96.1, 103.5], 48: [94.9, 103.3, 111.7], 60: [100.7, 110.0, 119.2], 72: [106.1, 116.0, 125.8] },
  },
  female: {
    weight: { 12: [7.0, 8.9, 11.5], 18: [8.1, 10.2, 13.2], 24: [9.0, 11.5, 14.8], 36: [10.8, 13.9, 18.1], 48: [12.3, 16.1, 21.5], 60: [13.7, 18.2, 24.9], 72: [15.3, 20.2, 27.8] },
    height: { 12: [68.9, 74.0, 79.2], 18: [74.9, 80.7, 86.5], 24: [79.3, 85.7, 92.2], 36: [87.4, 95.1, 102.7], 48: [94.1, 102.7, 111.3], 60: [99.9, 109.4, 118.9], 72: [104.9, 115.1, 125.4] },
  },
};

// Nội suy tuyến tính giá trị WHO tại tháng tuổi m
function whoAt(table, m) {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (m <= keys[0]) return table[keys[0]];
  if (m >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  const hi = keys.find((k) => k >= m);
  const lo = keys[keys.indexOf(hi) - 1];
  const t = (m - lo) / (hi - lo);
  return table[lo].map((v, i) => +(v + (table[hi][i] - v) * t).toFixed(1));
}

const CFG = {
  weight: { label: 'Cân nặng', unit: 'kg', color: '#2F9E5B' },
  height: { label: 'Chiều cao', unit: 'cm', color: '#4BA3E3' },
};

function Tip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const c = CFG[metric];
  return (
    <div className="card px-3 py-2 text-xs shadow-float">
      <p className="font-medium">{d.dateLabel} · {d.ageLabel}</p>
      {d.value != null && <p style={{ color: c.color }}>{c.label}: <strong>{d.value} {c.unit}</strong></p>}
      {d.bmi != null && <p className="text-ink-soft">BMI {d.bmi}</p>}
      {d.lo != null && <p className="text-ink-soft">WHO: {d.lo} – {d.hi} {c.unit}</p>}
    </div>
  );
}

/**
 * Biểu đồ tăng trưởng 1 bé: đường đo thực tế + vùng chuẩn WHO nhạt.
 * records: [{ measuredAt, height, weight, bmi }], dateOfBirth, gender ('male'|'female'), metric 'weight'|'height'
 */
export function GrowthChart({ records = [], dateOfBirth, gender = 'male', metric = 'weight', loading = false, height = 240 }) {
  if (loading) return <Skeleton className="h-60 w-full" />;
  const c = CFG[metric];
  const table = WHO[gender]?.[metric] || WHO.male[metric];
  const dob = dayjs(dateOfBirth);
  const sorted = [...records].sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt));

  // Trục tháng tuổi: từ lần đo đầu (hoặc 12 tháng) tới lần đo cuối (hoặc hiện tại), tối thiểu 12 tháng
  const ageOf = (d) => Math.max(0, dayjs(d).diff(dob, 'month', true));
  const first = sorted.length ? Math.floor(ageOf(sorted[0].measuredAt)) : Math.floor(ageOf(new Date())) - 6;
  const last = Math.ceil(Math.max(ageOf(new Date()), sorted.length ? ageOf(sorted[sorted.length - 1].measuredAt) : 0));
  const from = Math.max(6, Math.min(first - 2, last - 12));
  const to = Math.max(from + 12, last + 2);

  const rows = [];
  for (let m = from; m <= to; m++) {
    const [lo, mid, hi] = whoAt(table, m);
    rows.push({ age: m, lo, mid, hi, band: [lo, hi], ageLabel: `${m} tháng` });
  }
  for (const r of sorted) {
    const age = +ageOf(r.measuredAt).toFixed(1);
    const [lo, , hi] = whoAt(table, age);
    rows.push({ age, value: r[metric], bmi: r.bmi, lo, hi, dateLabel: dayjs(r.measuredAt).format('DD/MM/YYYY'), ageLabel: `${Math.floor(age)} tháng` });
  }
  rows.sort((a, b) => a.age - b.age);

  if (!dateOfBirth) return <p className="py-8 text-center text-sm text-ink-soft">Thiếu ngày sinh nên chưa vẽ được biểu đồ.</p>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E3E7EE" />
          <XAxis dataKey="age" type="number" domain={[from, to]} tickFormatter={(v) => `${v}t`} tick={{ fontSize: 12, fill: '#5B6478' }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#5B6478' }} tickLine={false} axisLine={false} unit={` ${c.unit}`} width={60} />
          <Tooltip content={<Tip metric={metric} />} />
          <Area type="monotone" dataKey="band" stroke="none" fill={c.color} fillOpacity={0.12} connectNulls isAnimationActive={false} name="Vùng WHO" />
          <Line type="monotone" dataKey="mid" stroke={c.color} strokeOpacity={0.35} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} name="Trung vị WHO" />
          <Line type="monotone" dataKey="value" stroke={c.color} strokeWidth={2.5} dot={{ r: 4, fill: c.color }} connectNulls isAnimationActive={false} name={c.label} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-ink-soft">Vùng màu nhạt: khoảng tham khảo WHO (−2SD đến +2SD) theo tháng tuổi. Nét đứt: trung vị.</p>
    </div>
  );
}
