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
