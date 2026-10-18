import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import dayjs from '../../utils/dayjs.js';
import { Skeleton } from '../ui/Skeleton.jsx';
import { whoValue, whoZ } from '../../utils/whoGrowth.js';

const CFG = {
  weight: { label: 'Cân nặng', unit: 'kg', color: '#2F9E5B' },
  height: { label: 'Chiều cao', unit: 'cm', color: '#4BA3E3' },
};

// Nhận định theo z-score WHO (chỉ để tham khảo)
export function zLabel(z) {
  if (z == null) return null;
  if (z < -3) return { text: 'Thấp hơn chuẩn nhiều (dưới −3SD)', tone: 'berry' };
  if (z < -2) return { text: 'Thấp hơn chuẩn (dưới −2SD)', tone: 'peach' };
  if (z > 3) return { text: 'Cao hơn chuẩn nhiều (trên +3SD)', tone: 'berry' };
  if (z > 2) return { text: 'Cao hơn chuẩn (trên +2SD)', tone: 'sun' };
  return { text: 'Trong khoảng bình thường (−2SD đến +2SD)', tone: 'leaf' };
}

function Tip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const c = CFG[metric];
  return (
    <div className="card px-3 py-2 text-xs shadow-float">
      <p className="font-medium">{d.dateLabel || `${Math.round(d.age)} tháng tuổi`}{d.dateLabel ? ` · ${Math.floor(d.age)} tháng` : ''}</p>
      {d.value != null && <p style={{ color: c.color }}>{c.label}: <strong>{d.value} {c.unit}</strong>{d.z != null && <span className="text-ink-soft"> (z = {d.z})</span>}</p>}
      {d.bmi != null && <p className="text-ink-soft">BMI {d.bmi}</p>}
      <p className="text-ink-soft">WHO: {d.band[0]} – {d.band[1]} {c.unit} · trung vị {d.mid}</p>
    </div>
  );
}

/**
 * Biểu đồ tăng trưởng 1 bé: đường đo thực tế + vùng tham khảo WHO (−2SD…+2SD) + trung vị.
 * records: [{ measuredAt, height, weight, bmi }], dateOfBirth, gender 'male'|'female', metric 'weight'|'height'
 * Dữ liệu WHO: utils/whoGrowth.js (LMS gốc, 0–60 tháng).
 */
export function GrowthChart({ records = [], dateOfBirth, gender = 'male', metric = 'weight', loading = false, height = 240 }) {
  if (loading) return <Skeleton className="h-60 w-full" />;
  if (!dateOfBirth) return <p className="py-8 text-center text-sm text-ink-soft">Thiếu ngày sinh nên chưa vẽ được biểu đồ.</p>;
  const c = CFG[metric];
  const sex = gender === 'female' ? 'female' : 'male';
  const dob = dayjs(dateOfBirth);
  const ageOf = (d) => Math.max(0, dayjs(d).diff(dob, 'month', true));
  const sorted = [...records].sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt));

  // Trục tháng tuổi (0–60): quanh các lần đo, tối thiểu 12 tháng
  const nowAge = ageOf(new Date());
  const firstAge = sorted.length ? ageOf(sorted[0].measuredAt) : nowAge - 6;
  const lastAge = Math.max(nowAge, sorted.length ? ageOf(sorted[sorted.length - 1].measuredAt) : 0);
  const from = Math.max(0, Math.floor(Math.min(firstAge - 2, lastAge - 12)));
  const to = Math.min(60, Math.max(from + 12, Math.ceil(lastAge + 2)));

  const rows = [];
  for (let m = from; m <= to; m++) rows.push({ age: m, band: [whoValue(sex, metric, m, -2), whoValue(sex, metric, m, 2)], mid: whoValue(sex, metric, m, 0) });
  for (const r of sorted) {
    const age = +ageOf(r.measuredAt).toFixed(1);
    if (age > 60) continue; // ngoài phạm vi chuẩn WHO 0–5 tuổi
    rows.push({ age, value: r[metric], bmi: r.bmi, z: whoZ(sex, metric, age, r[metric]), band: [whoValue(sex, metric, age, -2), whoValue(sex, metric, age, 2)], mid: whoValue(sex, metric, age, 0), dateLabel: dayjs(r.measuredAt).format('DD/MM/YYYY') });
  }
  rows.sort((a, b) => a.age - b.age);
  const last = [...rows].reverse().find((r) => r.value != null);
  const verdict = last ? zLabel(last.z) : null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E3E7EE" />
          <XAxis dataKey="age" type="number" domain={[from, to]} tickFormatter={(v) => `${v}t`} tick={{ fontSize: 12, fill: '#5B6478' }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#5B6478' }} tickLine={false} axisLine={false} unit={` ${c.unit}`} width={60} />
          <Tooltip content={<Tip metric={metric} />} />
          <Area type="monotone" dataKey="band" stroke="none" fill={c.color} fillOpacity={0.12} isAnimationActive={false} name="Vùng WHO −2SD…+2SD" />
          <Line type="monotone" dataKey="mid" stroke={c.color} strokeOpacity={0.4} strokeDasharray="4 4" dot={false} isAnimationActive={false} name="Trung vị WHO" />
          <Line type="monotone" dataKey="value" stroke={c.color} strokeWidth={2.5} dot={{ r: 4, fill: c.color }} connectNulls isAnimationActive={false} name={c.label} />
        </ComposedChart>
      </ResponsiveContainer>
      {verdict && (
        <p className="mt-2 text-sm">
          Lần đo gần nhất: <strong>{last.value} {c.unit}</strong> · z-score {last.z} · <span className={`text-${verdict.tone === 'leaf' ? 'leaf-dark' : verdict.tone}`}>{verdict.text}</span>
        </p>
      )}
      <p className="mt-1 text-xs text-ink-soft">
        Vùng màu nhạt: −2SD đến +2SD, nét đứt: trung vị. Nguồn: WHO Child Growth Standards (2006), bảng {metric === 'weight' ? 'weight-for-age' : 'length/height-for-age'} theo giới tính, 0–5 tuổi (who.int/tools/child-growth-standards). Chỉ để tham khảo, không thay chẩn đoán của bác sĩ.
      </p>
    </div>
  );
}
