import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import { TIMEZONE } from '../config/constants.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

export { dayjs };

// Ngày date-only: xác định Y-M-D theo giờ VN, lưu 00:00 UTC của ngày đó
export function toDateKey(input = new Date()) {
  const d = dayjs(input).tz(TIMEZONE);
  return new Date(Date.UTC(d.year(), d.month(), d.date()));
}

// Hôm nay (VN) dạng date-key
export const todayKey = () => toDateKey(new Date());

// 'YYYY-MM' → [đầu tháng, đầu tháng sau) dạng date-key
export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
}

// Thứ 2 đầu tuần (date-key) của ngày bất kỳ
export function weekStartKey(input) {
  const d = dayjs(input).tz(TIMEZONE).startOf('isoWeek');
  return new Date(Date.UTC(d.year(), d.month(), d.date()));
}

// Danh sách date-key từ from..to (bao gồm), tuỳ chọn bỏ T7/CN
export function eachDay(from, to, { skipWeekend = false } = {}) {
  const days = [];
  let cur = dayjs.utc(toDateKey(from));
  const end = dayjs.utc(toDateKey(to));
  while (!cur.isAfter(end)) {
    const dow = cur.day(); // date-key là UTC midnight nên day() đúng thứ
    if (!skipWeekend || (dow !== 0 && dow !== 6)) days.push(cur.toDate());
    cur = cur.add(1, 'day');
  }
  return days;
}

export const formatVN = (d, fmt = 'DD/MM/YYYY') => dayjs(d).tz(TIMEZONE).format(fmt);
export const monthKey = (d = new Date()) => dayjs(d).tz(TIMEZONE).format('YYYY-MM');
