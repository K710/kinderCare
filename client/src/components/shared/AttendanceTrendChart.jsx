import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import dayjs from '../../utils/dayjs.js';
import { Skeleton } from '../ui/Skeleton.jsx';

// Màu theo DESIGN.md: có mặt leaf, đi muộn sky, vắng có phép sun, vắng không phép peach
const SERIES = [
  { key: 'present', name: 'Có mặt', color: '#2F9E5B' },
  { key: 'late', name: 'Đi muộn', color: '#4BA3E3' },
  { key: 'excused', name: 'Vắng có phép', color: '#FFC23D' },
  { key: 'absent', name: 'Vắng không phép', color: '#FF7F6E' },
];

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs shadow-float">
      <p className="font-medium">{dayjs(d.date).format('dddd, DD/MM/YYYY')}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-1.5 tabular-nums">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
          {s.name}: {d[s.key]}
        </p>
      ))}
      {d.rate != null && <p className="mt-1 text-ink-soft">Chuyên cần {d.rate}%</p>}
    </div>
  );
}

// Biểu đồ cột chồng chuyên cần theo ngày (30 ngày, bỏ T7/CN)
export function AttendanceTrendChart({ data = [], loading = false, height = 260 }) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  const rows = data.map((d) => ({ ...d, label: dayjs(d.date).format('DD/MM') }));
  if (!rows.some((r) => r.total)) {
    return <p className="py-10 text-center text-sm text-ink-soft">Chưa có dữ liệu điểm danh trong 30 ngày qua.</p>;
  }
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} barCategoryGap={3} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E3E7EE" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5B6478' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5B6478' }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: '#F6F8FB' }} />
          {SERIES.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} name={s.name} radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
