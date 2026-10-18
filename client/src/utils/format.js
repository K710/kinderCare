import dayjs from './dayjs.js';

// 1500000 → "1.500.000 ₫"
export const formatMoney = (n) => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;

// "Thứ Hai, 19/10/2026" (viết hoa chữ cái đầu của thứ)
export function formatDateFull(d) {
  const s = dayjs(d).format('dddd, DD/MM/YYYY');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const formatDate = (d) => dayjs(d).format('DD/MM/YYYY');
export const formatTime = (d) => dayjs(d).format('HH:mm');
export const formatDateTime = (d) => dayjs(d).format('HH:mm DD/MM/YYYY');
export const fromNow = (d) => dayjs(d).fromNow();

// "2026-10" → "Tháng 10/2026"
export function formatMonth(m) {
  const [y, mo] = String(m).split('-');
  return `Tháng ${Number(mo)}/${y}`;
}

// Tuần bắt đầu thứ Hai: "Tuần 20/10 – 24/10/2026"
export function formatWeek(weekStart) {
  const s = dayjs(weekStart);
  return `Tuần ${s.format('DD/MM')} – ${s.add(4, 'day').format('DD/MM/YYYY')}`;
}
// Thứ Hai (YYYY-MM-DD) của tuần chứa ngày d
export const toMonday = (d) => dayjs(d).startOf('isoWeek').format('YYYY-MM-DD');
export const currentMonth = () => dayjs().format('YYYY-MM');
export const toInputDate = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '');

// Giấc ngủ: { duration (phút), quality } → "1 giờ 30 phút · Ngủ ngon" (null nếu trống)
const SLEEP_QUALITY = { good: 'Ngủ ngon', normal: 'Bình thường', bad: 'Khó ngủ' };
export function formatSleep(sleep) {
  if (!sleep) return null;
  const parts = [];
  if (sleep.duration) {
    const h = Math.floor(sleep.duration / 60);
    const m = sleep.duration % 60;
    parts.push([h ? `${h} giờ` : '', m ? `${m} phút` : ''].filter(Boolean).join(' '));
  }
  if (sleep.quality) parts.push(SLEEP_QUALITY[sleep.quality] || sleep.quality);
  return parts.length ? parts.join(' · ') : null;
}
// Tên gọi của bé: tên ở nhà nếu có, không thì tên đầy đủ
export const childName = (c) => c?.nickname || c?.fullName || '';

// Tuổi: "3 tuổi 4 tháng"
export function formatAge(dob) {
  const months = dayjs().diff(dayjs(dob), 'month');
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y ? `${y} tuổi${m ? ` ${m} tháng` : ''}` : `${m} tháng`;
}

// Chữ cái đầu cho avatar
export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
