import { Select } from '../ui/index.js';

// Chọn lớp (giáo viên nhiều lớp). 1 lớp → chỉ hiện tên
export function ClassSelect({ classes = [], value, onChange, className }) {
  if (classes.length <= 1) {
    return classes[0] ? <span className={`font-display text-lg font-semibold ${className || ''}`}>{classes[0].name}</span> : null;
  }
  return (
    <Select
      aria-label="Chọn lớp"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={classes.map((c) => ({ value: c._id, label: c.name }))}
      className={className || 'w-44'}
    />
  );
}
