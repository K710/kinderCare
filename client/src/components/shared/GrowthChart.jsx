import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import dayjs from '../../utils/dayjs.js';
import { Skeleton } from '../ui/Skeleton.jsx';
import { whoValue, whoZ, whoCovers, WHO_MAX_MONTH } from '../../utils/whoGrowth.js';
import { formatNumber } from '../../utils/format.js';

const CFG = {
  weight: { label: 'Cân nặng', unit: 'kg', color: '#2F9E5B', ref: 'weight-for-age' },
  height: { label: 'Chiều cao', unit: 'cm', color: '#4BA3E3', ref: 'length/height-for-age' },
};

// Lần đo mới nhất (cùng một hàm cho ô số liệu và nhận định): theo ngày đo, cùng ngày thì bản ghi tạo sau
export function latestRecord(records = []) {
  return [...records].sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0)).at(-1) || null;
}

// Nhận định theo z-score. Lời cho PH không dùng thuật ngữ; chi tiết SD để ở ghi chú nhỏ
export function zLabel(z, metricLabel = 'Chỉ số') {
  if (z == null) return null;
  if (z < -3) return { text: `${metricLabel} thấp hơn nhiều so với trẻ cùng tuổi`, tone: 'berry', sd: 'dưới −3SD' };
  if (z < -2) return { text: `${metricLabel} thấp hơn khoảng phổ biến của trẻ cùng tuổi`, tone: 'peach', sd: 'dưới −2SD' };
  if (z > 3) return { text: `${metricLabel} cao hơn nhiều so với trẻ cùng tuổi`, tone: 'berry', sd: 'trên +3SD' };
  if (z > 2) return { text: `${metricLabel} cao hơn khoảng phổ biến của trẻ cùng tuổi`, tone: 'sun', sd: 'trên +2SD' };
  return { text: `${metricLabel} nằm trong khoảng phổ biến của trẻ cùng tuổi`, tone: 'leaf', sd: 'từ −2SD đến +2SD' };
}
const TONE_TEXT = { leaf: 'text-leaf-dark', sun: 'text-[#8A6100]', peach: 'text-[#B5412F]', berry: 'text-berry' };

function Tip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const c = CFG[metric];
  return (
    <div className="card px-3 py-2 text-xs shadow-float">
      <p className="font-medium">{d.dateLabel || `${Math.round(d.age)} tháng tuổi`}{d.dateLabel ? ` · ${Math.floor(d.age)} tháng` : ''}</p>
      {d.value != null && <p style={{ color: c.color }}>{c.label}: <strong>{formatNumber(d.value)} {c.unit}</strong></p>}
      <p className="text-ink-soft">Khoảng phổ biến: {formatNumber(d.band[0])} – {formatNumber(d.band[1])} {c.unit} · trung vị {formatNumber(d.mid)}</p>
    </div>
  );
}

/**
 * Biểu đồ tăng trưởng 1 bé: đường đo thực tế + vùng tham khảo WHO (−2SD…+2SD) + trung vị.
 * records: [{ measuredAt, height, weight }], dateOfBirth, gender, metric 'weight'|'height'
 * audience: 'parent' (lời nói thường, SD ở ghi chú) | 'staff' (kèm z-score)
 */
export function GrowthChart({ records = [], dateOfBirth, gender = 'male', metric = 'weight', audience = 'staff', loading = false, height = 240 }) {
  if (loading) return <Skeleton className="h-60 w-full" />;
  if (!dateOfBirth) return <p className="py-8 text-center text-sm text-ink-soft">Thiếu ngày sinh nên chưa vẽ được biểu đồ.</p>;
  const c = CFG[metric];
  const sex = gender === 'female' ? 'female' : 'male';
  const dob = dayjs(dateOfBirth);
  const ageOf = (d) => Math.max(0, dayjs(d).diff(dob, 'month', true));
  const sorted = [...records].sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt));
  const maxM = WHO_MAX_MONTH[metric];

  // Trục tháng tuổi quanh các lần đo, tối thiểu 12 tháng, trong phạm vi dữ liệu WHO
  const nowAge = ageOf(new Date());
  const firstAge = sorted.length ? ageOf(sorted[0].measuredAt) : nowAge - 6;
  const lastAge = Math.max(nowAge, sorted.length ? ageOf(sorted[sorted.length - 1].measuredAt) : 0);
  const from = Math.max(0, Math.floor(Math.min(firstAge - 2, lastAge - 12)));
  const to = Math.min(maxM, Math.max(from + 12, Math.ceil(lastAge + 2)));

  const rows = [];
  for (let m = from; m <= to; m++) rows.push({ age: m, band: [whoValue(sex, metric, m, -2), whoValue(sex, metric, m, 2)], mid: whoValue(sex, metric, m, 0) });
  let skipped = 0;
  for (const r of sorted) {
    const age = +ageOf(r.measuredAt).toFixed(1);
    if (!whoCovers(metric, age)) { skipped++; continue; }
    rows.push({ age, value: r[metric], z: whoZ(sex, metric, age, r[metric]), band: [whoValue(sex, metric, age, -2), whoValue(sex, metric, age, 2)], mid: whoValue(sex, metric, age, 0), dateLabel: dayjs(r.measuredAt).format('DD/MM/YYYY') });
  }
  rows.sort((a, b) => a.age - b.age);

  // Nhận định dùng đúng lần đo mới nhất (cùng hàm latestRecord với ô số liệu)
  const last = latestRecord(records);
  const lastAgeM = last ? ageOf(last.measuredAt) : null;
  const lastZ = last && whoCovers(metric, lastAgeM) ? whoZ(sex, metric, lastAgeM, last[metric]) : null;
  const verdict = lastZ != null ? zLabel(lastZ, c.label) : null;
  const tickFmt = (v) => (v >= 24 ? `${Math.floor(v / 12)}t${v % 12 ? `${v % 12}` : ''}` : `${v}th`);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E3E7EE" />
          <XAxis dataKey="age" type="number" domain={[from, to]} tickFormatter={tickFmt} tick={{ fontSize: 12, fill: '#5B6478' }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#5B6478' }} tickFormatter={(v) => formatNumber(v, 0)} tickLine={false} axisLine={false} unit={` ${c.unit}`} width={64} />
          <Tooltip content={<Tip metric={metric} />} />
          <Area type="monotone" dataKey="band" stroke="none" fill={c.color} fillOpacity={0.12} isAnimationActive={false} name="Khoảng phổ biến (WHO)" />
          <Line type="monotone" dataKey="mid" stroke={c.color} strokeOpacity={0.4} strokeDasharray="4 4" dot={false} isAnimationActive={false} name="Trung vị WHO" />
          <Line type="monotone" dataKey="value" stroke={c.color} strokeWidth={2.5} dot={{ r: 4, fill: c.color }} connectNulls isAnimationActive={false} name={c.label} />
        </ComposedChart>
      </ResponsiveContainer>
      {verdict && (
        <p className="mt-2 text-sm">
          Lần đo {dayjs(last.measuredAt).format('DD/MM/YYYY')}: <strong>{formatNumber(last[metric])} {c.unit}</strong> · <span className={TONE_TEXT[verdict.tone]}>{verdict.text}</span>
          {audience === 'staff' && <span className="text-ink-soft"> (z = {formatNumber(lastZ, 2)}, {verdict.sd})</span>}
        </p>
      )}
      {last && lastZ == null && <p className="mt-2 text-sm text-ink-soft">Bé đã quá tuổi có dữ liệu tham khảo WHO cho {c.label.toLowerCase()} ({maxM / 12} tuổi).</p>}
      <p className="mt-1 text-xs text-ink-soft">
        Vùng màu nhạt là khoảng phổ biến (−2SD đến +2SD){audience === 'parent' && verdict ? `, lần đo gần nhất ở mức ${verdict.sd}` : ''}; nét đứt là trung vị.
        {skipped > 0 && ` ${skipped} lần đo ngoài phạm vi tham khảo không vẽ.`} Nguồn: WHO Child Growth Standards 2006 (0–5 tuổi) và WHO Growth Reference 2007 ({metric === 'weight' ? '5–10' : '5–19'} tuổi), bảng {c.ref} theo giới tính. Chỉ để tham khảo, không thay chẩn đoán của bác sĩ.
      </p>
    </div>
  );
}
