/**
 * Seed dữ liệu demo (CHỈ DEV): npm run seed
 * - Xoá toàn bộ DB hiện tại rồi tạo lại → chạy lại nhiều lần không lỗi.
 * - Từ chối chạy khi NODE_ENV=production (trừ khi --force).
 * - Mật khẩu mọi tài khoản demo: 123456, mustChangePassword = false.
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { TIMEZONE } from '../config/constants.js';
import {
  User, SchoolYear, Class, Student, Attendance, DailyReport, HealthRecord, Menu, LessonPlan,
  LeaveRequest, MedicineNote, Tuition, Payment, Notification, Message, Album,
} from '../models/index.js';
import { conversationIdOf } from '../models/Message.js';
import { dayjs, toDateKey, todayKey, weekStartKey, eachDay, monthKey } from '../utils/date.js';
import { uniquePaymentCode, computeStatus } from '../services/tuition.service.js';
import { calcBmi } from '../services/healthRecord.service.js';
import { assertPasswordPolicy } from '../utils/password.js';

const PASSWORD = '123456';
const force = process.argv.includes('--force');
if (env.NODE_ENV === 'production' && !force) {
  console.error('Seed chỉ dùng cho môi trường dev. Thêm --force nếu thật sự muốn chạy trên production.');
  process.exit(1);
}
assertPasswordPolicy(PASSWORD);

// PRNG cố định để dữ liệu lặp lại giống nhau giữa các lần chạy
let seed = 20261018;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + rand() * (b - a);
const round1 = (n) => Math.round(n * 10) / 10;

// Thời điểm giờ VN của một date-key: atVN(dateKey, '07:30')
const atVN = (dateKey, hm) => dayjs.tz(`${dayjs.utc(dateKey).format('YYYY-MM-DD')} ${hm}`, TIMEZONE).toDate();
const img = (k, w = 800, h = 600) => `https://picsum.photos/seed/kindercare-${k}/${w}/${h}`;

const TODAY = todayKey();
const MONTH = monthKey();
const now = new Date();

async function main() {
  await connectDB();
  const dbName = mongoose.connection.db.databaseName;
  console.log(`→ Xoá toàn bộ dữ liệu trong DB "${dbName}" và tạo lại dữ liệu demo…`);
  await mongoose.connection.db.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  /* ---------- Tài khoản ---------- */
  const mk = (role, email, fullName, phone) => ({ role, email, fullName, phone, password: PASSWORD, isActive: true, mustChangePassword: false });
  const [admin, ht, gv1, gv2, ph1, ph2, ph3, ...phExtra] = await User.create([
    mk('admin', 'admin@kindercare.vn', 'Quản trị viên', '0900000001'),
    mk('principal', 'ht@kindercare.vn', 'Phạm Thị Hồng', '0900000002'),
    { ...mk('teacher', 'gv1@kindercare.vn', 'Nguyễn Thị Lan', '0900000003'), honorific: 'co' },
    { ...mk('teacher', 'gv2@kindercare.vn', 'Trần Thu Hà', '0900000004'), honorific: 'co' },
    mk('parent', 'ph1@kindercare.vn', 'Lê Văn Minh', '0900000005'),
    mk('parent', 'ph2@kindercare.vn', 'Hoàng Thị Mai', '0900000006'),
    mk('parent', 'ph3@kindercare.vn', 'Vũ Đức Anh', '0900000007'),
    mk('parent', 'ph4@kindercare.vn', 'Đặng Thu Trang', '0900000008'),
    mk('parent', 'ph5@kindercare.vn', 'Bùi Quang Huy', '0900000009'),
    mk('parent', 'ph6@kindercare.vn', 'Ngô Thị Thuý', '0900000010'),
    mk('parent', 'ph7@kindercare.vn', 'Phan Văn Tùng', '0900000011'),
    mk('parent', 'ph8@kindercare.vn', 'Đỗ Ngọc Hân', '0900000012'),
    mk('parent', 'ph9@kindercare.vn', 'Trịnh Minh Khoa', '0900000013'),
  ]);

  /* ---------- Năm học & lớp ---------- */
  const y = dayjs(TODAY).month() >= 7 ? dayjs(TODAY).year() : dayjs(TODAY).year() - 1; // năm học bắt đầu tháng 9
  const sy = await SchoolYear.create({ name: `${y}-${y + 1}`, startDate: new Date(Date.UTC(y, 8, 1)), endDate: new Date(Date.UTC(y + 1, 4, 31)), isCurrent: true, tuitionDefault: 1500000 });
  const [la2, choi1] = await Class.create([
    { name: 'Lá 2', ageGroup: 'la', schoolYear: sy._id, teachers: [gv1._id], room: 'A2', capacity: 25 },
    { name: 'Chồi 1', ageGroup: 'choi', schoolYear: sy._id, teachers: [gv2._id], room: 'B1', capacity: 25 },
  ]);

  /* ---------- Học sinh (10 bé) ---------- */
  const dob = (years, monthOffset) => new Date(Date.UTC(dayjs(TODAY).year() - years, dayjs(TODAY).month() - monthOffset, 1 + Math.floor(rand() * 27)));
  const kidsDef = [
    // Lá 2 (5 tuổi)
    { fullName: 'Lê Minh Khang', nickname: 'Bin', gender: 'male', cls: la2, years: 5, m: 3, parents: [ph1], allergies: ['Hải sản'] },
    { fullName: 'Hoàng Bảo Anh', nickname: 'Su', gender: 'female', cls: la2, years: 5, m: 6, parents: [ph2] },
    { fullName: 'Đặng Gia Hân', nickname: 'Bông', gender: 'female', cls: la2, years: 5, m: 1, parents: [phExtra[0]] },
    { fullName: 'Bùi Quang Minh', nickname: 'Tít', gender: 'male', cls: la2, years: 5, m: 8, parents: [phExtra[1]], medicalNotes: 'Hen nhẹ, có ống hít ở túi.' },
    { fullName: 'Ngô Thanh Thảo', nickname: 'Nấm', gender: 'female', cls: la2, years: 4, m: 11, parents: [phExtra[2]] },
    // Chồi 1 (4 tuổi)
    { fullName: 'Lê Minh Anh', nickname: 'Na', gender: 'female', cls: choi1, years: 4, m: 2, parents: [ph1] },
    { fullName: 'Vũ Hoàng Nam', nickname: 'Bo', gender: 'male', cls: choi1, years: 4, m: 5, parents: [ph3], allergies: ['Đậu phộng', 'Sữa bò'] },
    { fullName: 'Phan Bảo Ngọc', nickname: 'Mít', gender: 'female', cls: choi1, years: 4, m: 0, parents: [phExtra[3]] },
    { fullName: 'Đỗ Tuấn Kiệt', nickname: 'Cốm', gender: 'male', cls: choi1, years: 3, m: 10, parents: [phExtra[4]] },
    { fullName: 'Trịnh An Nhiên', nickname: 'Đậu', gender: 'female', cls: choi1, years: 4, m: 7, parents: [phExtra[5]] },
  ];
  const students = await Student.create(
    kidsDef.map((k, i) => ({
      fullName: k.fullName, nickname: k.nickname, gender: k.gender, dateOfBirth: dob(k.years, k.m), class: k.cls._id,
      parents: k.parents.map((p) => p._id), enrollDate: sy.startDate, status: 'active', allergies: k.allergies || [], medicalNotes: k.medicalNotes || '',
      emergencyContact: { name: `Ông/bà của bé ${k.nickname}`, phone: `09123456${String(i).padStart(2, '0')}`, relation: 'Ông bà' },
    })),
  );
  const teacherOf = (st) => (st.class.equals(la2._id) ? gv1 : gv2);

  /* ---------- Điểm danh + nhận xét 14 ngày gần nhất (bỏ T7/CN) ---------- */
  // 14 ngày gần nhất bỏ T7/CN, nhưng luôn có HÔM NAY (kể cả cuối tuần) để trang Hôm nay của PH đủ mốc timeline
  const days = eachDay(dayjs(TODAY).subtract(13, 'day').toDate(), TODAY, { skipWeekend: true });
  if (!days.some((d) => d.getTime() === TODAY.getTime())) days.push(TODAY);
  const ACT = ['Vẽ tranh', 'Hát múa', 'Kể chuyện', 'Xếp hình', 'Chơi ngoài trời', 'Làm quen chữ cái', 'Thể dục buổi sáng', 'Nặn đất sét', 'Học đếm số'];
  const COMMENT = [
    'Hôm nay bé rất ngoan, ăn hết suất và tự xúc cơm.',
    'Bé tham gia hoạt động sôi nổi, biết chia sẻ đồ chơi với bạn.',
    'Bé hơi mệt buổi sáng nhưng chiều đã vui vẻ trở lại.',
    'Bé ngủ trưa ngon, dậy tự gấp chăn gối.',
    'Bé kể chuyện rất hay, cả lớp vỗ tay khen.',
    'Bé ăn ít bữa trưa, ba mẹ để ý bữa tối giúp cô nhé.',
    'Bé tự giác cất dép, rửa tay trước khi ăn. Rất đáng khen!',
  ];
  const attendance = [];
  const reports = [];
  // Bé "Tít" nghỉ có phép 2 ngày tuần trước (đơn đã duyệt), bé "Cốm" vắng không phép 1 ngày
  const excusedDays = days.slice(3, 5).map((d) => d.getTime());
  const absentDay = days[Math.max(0, days.length - 4)].getTime();
  for (const d of days) {
    const isToday = d.getTime() === TODAY.getTime();
    for (const st of students) {
      let status = 'present';
      if (st.nickname === 'Tít' && excusedDays.includes(d.getTime())) status = 'excused';
      else if (st.nickname === 'Cốm' && d.getTime() === absentDay) status = 'absent';
      else if (rand() < 0.08) status = 'late';
      const present = status === 'present' || status === 'late';
      attendance.push({
        student: st._id, class: st.class, date: d, status, markedBy: teacherOf(st)._id,
        checkInAt: present ? atVN(d, status === 'late' ? `08:${String(10 + Math.floor(rand() * 40)).padStart(2, '0')}` : `07:${String(15 + Math.floor(rand() * 44)).padStart(2, '0')}`) : undefined,
        checkOutAt: present ? atVN(d, `16:${String(20 + Math.floor(rand() * 39)).padStart(2, '0')}`) : undefined,
        note: status === 'excused' ? 'Nghỉ có phép' : status === 'late' ? 'Mẹ báo kẹt xe' : '',
      });
      if (present) {
        reports.push({
          student: st._id, class: st.class, date: d, teacher: teacherOf(st)._id,
          meals: { breakfast: pick(['good', 'good', 'normal']), lunch: pick(['good', 'normal', 'little']), snack: pick(['good', 'normal']) },
          sleep: { duration: pick([90, 105, 120]), quality: pick(['good', 'good', 'normal']) },
          mood: pick(['happy', 'happy', 'normal']), toilet: pick([1, 2, 3]),
          activities: [pick(ACT), pick(ACT)].filter((v, i, a) => a.indexOf(v) === i),
          comment: pick(COMMENT),
          photos: isToday || rand() < 0.3 ? [img(`${st.nickname}-${dayjs(d).format('DDMM')}-1`), img(`${st.nickname}-${dayjs(d).format('DDMM')}-2`)] : [],
          parentSeenAt: isToday ? null : atVN(d, '19:30'),
        });
      }
    }
  }
  await Attendance.insertMany(attendance);
  await DailyReport.insertMany(reports);

  /* ---------- Chiều cao / cân nặng: 8 tháng gần nhất ---------- */
  const health = [];
  for (const st of students) {
    const ageM = dayjs(TODAY).diff(dayjs(st.dateOfBirth), 'month');
    const base = st.gender === 'male' ? { h: 86 + (ageM - 24) * 0.62, w: 12 + (ageM - 24) * 0.19 } : { h: 85 + (ageM - 24) * 0.6, w: 11.5 + (ageM - 24) * 0.18 };
    const bias = between(-1, 1);
    for (let i = 7; i >= 0; i--) {
      const measuredAt = toDateKey(dayjs(TODAY).subtract(i, 'month').date(5).toDate());
      const h = round1(base.h - i * 0.6 + bias * 2 + between(-0.3, 0.3));
      const w = round1(base.w - i * 0.18 + bias * 0.8 + between(-0.15, 0.15));
      health.push({ student: st._id, measuredAt, height: h, weight: w, bmi: calcBmi(h, w), note: i === 0 ? 'Đo định kỳ tháng này' : '', recordedBy: teacherOf(st)._id });
    }
  }
  await HealthRecord.insertMany(health);

  /* ---------- Thực đơn: tuần trước + tuần này (đã duyệt), tuần sau (chờ duyệt) ---------- */
  const menuDays = (shift) => [
    { dayOfWeek: 1, breakfast: ['Cháo thịt bằm', 'Sữa tươi'], lunch: ['Cơm', 'Thịt kho trứng cút', 'Canh bí đỏ'], snack: ['Chuối', 'Sữa chua'] },
    { dayOfWeek: 2, breakfast: ['Phở gà'], lunch: ['Cơm', 'Cá thu sốt cà', 'Canh rau ngót'], snack: ['Bánh flan'] },
    { dayOfWeek: 3, breakfast: ['Bún riêu cua'], lunch: ['Cơm', 'Gà kho gừng', 'Canh cải xanh nấu tôm'], snack: ['Đu đủ', 'Sữa đậu nành'] },
    { dayOfWeek: 4, breakfast: ['Xôi gấc', 'Sữa tươi'], lunch: ['Cơm', 'Bò xào rau củ', 'Canh chua cá lóc'], snack: ['Bánh bông lan'] },
    { dayOfWeek: 5, breakfast: ['Mì Quảng gà'], lunch: ['Cơm', 'Trứng chiên thịt', 'Canh mồng tơi'], snack: ['Dưa hấu', 'Sữa chua'], note: shift === 1 ? 'Thứ Sáu tuần sau có tiệc sinh nhật tháng' : undefined },
  ];
  const thisMonday = weekStartKey(TODAY);
  await Menu.create([
    { weekStart: dayjs(thisMonday).subtract(7, 'day').toDate(), ageGroup: 'all', days: menuDays(-1), status: 'approved', createdBy: ht._id, approvedBy: ht._id, approvedAt: dayjs(thisMonday).subtract(9, 'day').toDate() },
    { weekStart: thisMonday, ageGroup: 'all', days: menuDays(0), status: 'approved', createdBy: ht._id, approvedBy: ht._id, approvedAt: dayjs(thisMonday).subtract(2, 'day').toDate() },
    { weekStart: dayjs(thisMonday).add(7, 'day').toDate(), ageGroup: 'all', days: menuDays(1), status: 'pending', createdBy: ht._id },
  ]);

  /* ---------- Kế hoạch giảng dạy ---------- */
  const planDays = (theme) => [1, 2, 3, 4, 5].map((d) => ({
    dayOfWeek: d,
    activities: [
      { time: '08:00-08:30', title: 'Thể dục buổi sáng', goal: 'Vận động, khởi động ngày mới' },
      { time: '08:45-09:30', title: `Khám phá chủ đề: ${theme}`, goal: 'Nhận biết, gọi tên, mô tả', materials: 'Tranh ảnh, mô hình' },
      { time: '09:45-10:30', title: pick(['Tạo hình', 'Âm nhạc', 'Làm quen toán', 'Kể chuyện']), goal: 'Phát triển thẩm mỹ và ngôn ngữ' },
    ],
  }));
  await LessonPlan.create([
    { class: la2._id, teacher: gv1._id, weekStart: thisMonday, theme: 'Thế giới động vật', days: planDays('Thế giới động vật'), status: 'approved', approvedBy: ht._id, approvedAt: dayjs(thisMonday).subtract(1, 'day').toDate() },
    { class: la2._id, teacher: gv1._id, weekStart: dayjs(thisMonday).add(7, 'day').toDate(), theme: 'Nghề nghiệp quanh em', days: planDays('Nghề nghiệp quanh em'), status: 'pending' },
    { class: choi1._id, teacher: gv2._id, weekStart: thisMonday, theme: 'Gia đình của bé', days: planDays('Gia đình của bé'), status: 'pending' },
    { class: choi1._id, teacher: gv2._id, weekStart: dayjs(thisMonday).add(7, 'day').toDate(), theme: 'Phương tiện giao thông', days: planDays('Phương tiện giao thông').slice(0, 3), status: 'draft' },
  ]);

  /* ---------- Album ảnh ---------- */
  const albums = [];
  [[la2, gv1], [choi1, gv2]].forEach(([cls, gv]) => {
    ['Hoạt động ngoài trời', 'Giờ học tạo hình', 'Sinh nhật tháng'].forEach((title, i) => {
      albums.push({
        title, description: `${title} của lớp ${cls.name}`, class: cls._id, createdBy: gv._id,
        date: days[Math.max(0, days.length - 1 - i * 3)],
        photos: Array.from({ length: 6 }, (_, k) => ({ url: img(`${cls.name}-${i}-${k}`), publicId: '', caption: k === 0 ? 'Cả lớp cùng chơi' : '' })),
      });
    });
  });
  await Album.insertMany(albums);

  /* ---------- Học phí tháng này: đủ trạng thái + 1 giao dịch unmatched ---------- */
  const items = [{ name: 'Học phí', amount: 1500000 }, { name: 'Tiền ăn', amount: 700000 }];
  const amount = 2200000;
  const dueDate = new Date(Date.UTC(dayjs(TODAY).year(), dayjs(TODAY).month(), 10)); // hạn mùng 10
  const scenarios = ['paid', 'paid', 'paid', 'partial', 'partial', 'unpaid', 'unpaid', 'unpaid', 'overdue', 'overdue'];
  const payments = [];
  let sepayId = 90000000;
  const tuitions = [];
  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    const sc = scenarios[i];
    const paymentCode = await uniquePaymentCode();
    // overdue: hạn đã qua; unpaid: hạn còn (cuối tháng); paid/partial: hạn mùng 10
    // partial/unpaid: hạn cuối tháng (còn hạn); overdue: hạn đã qua; paid: hạn mùng 10
    const due = sc === 'unpaid' || sc === 'partial' ? dayjs(TODAY).endOf('month').startOf('day').toDate() : sc === 'overdue' ? dayjs(TODAY).subtract(5, 'day').toDate() : dueDate;
    const paid = sc === 'paid' ? amount : sc === 'partial' ? 1500000 : 0;
    const t = await Tuition.create({ student: st._id, class: st.class, schoolYear: sy._id, month: MONTH, items, amount, paidAmount: paid, dueDate: toDateKey(due), paymentCode, createdBy: ht._id, status: computeStatus(amount, paid, toDateKey(due)) });
    tuitions.push(t);
    if (paid > 0) {
      const when = dayjs(TODAY).subtract(2 + i, 'day').hour(9).toDate();
      payments.push({
        sepayId: ++sepayId, method: 'bank', gateway: env.SEPAY_BANK || 'MBBank', transactionDate: when, accountNumber: env.SEPAY_ACCOUNT || '0123456789',
        content: `${paymentCode} ${st.fullName.toUpperCase()}`, transferType: 'in', amount: paid, referenceCode: `FT${sepayId}`, paymentCode, tuition: t._id, status: 'matched',
        rawPayload: { id: sepayId, transferAmount: paid, content: `${paymentCode} ${st.fullName}`, demo: true },
      });
    }
  }
  // Tháng trước: tất cả đã đóng (lịch sử)
  const prevMonth = dayjs(`${MONTH}-01`).subtract(1, 'month').format('YYYY-MM');
  for (const st of students) {
    const paymentCode = await uniquePaymentCode();
    const due = new Date(Date.UTC(dayjs(prevMonth).year(), dayjs(prevMonth).month(), 10));
    const t = await Tuition.create({ student: st._id, class: st.class, schoolYear: sy._id, month: prevMonth, items, amount, paidAmount: amount, dueDate: due, paymentCode, createdBy: ht._id, status: 'paid' });
    payments.push({ sepayId: ++sepayId, method: pick(['bank', 'bank', 'cash']), gateway: env.SEPAY_BANK || 'MBBank', transactionDate: dayjs(due).subtract(3, 'day').toDate(), accountNumber: env.SEPAY_ACCOUNT || '', content: `${paymentCode}`, transferType: 'in', amount, referenceCode: `FT${sepayId}`, paymentCode, tuition: t._id, status: 'matched' });
  }
  // Giao dịch chưa khớp (PH ghi sai nội dung)
  payments.push({
    sepayId: ++sepayId, method: 'bank', gateway: env.SEPAY_BANK || 'MBBank', transactionDate: dayjs(TODAY).subtract(1, 'day').hour(20).toDate(), accountNumber: env.SEPAY_ACCOUNT || '0123456789',
    content: 'CK hoc phi be Khang lop La 2', transferType: 'in', amount: 2200000, referenceCode: `FT${sepayId}`, paymentCode: null, tuition: null, status: 'unmatched',
    note: 'Không tìm thấy mã HP trong nội dung', rawPayload: { id: sepayId, content: 'CK hoc phi be Khang lop La 2', transferAmount: 2200000, demo: true },
  });
  await Payment.insertMany(payments.map((p) => (p.method === 'cash' ? { ...p, sepayId: undefined, gateway: '', accountNumber: '', referenceCode: '', content: '', status: 'manual', note: 'Thu tiền mặt tại văn phòng', assignedBy: ht._id, assignedAt: p.transactionDate } : p)));

  /* ---------- Đơn xin nghỉ ---------- */
  const tit = students.find((s) => s.nickname === 'Tít');
  const su = students.find((s) => s.nickname === 'Su');
  const bo = students.find((s) => s.nickname === 'Bo');
  const bin = students.find((s) => s.nickname === 'Bin');
  const parentOf = (st) => [ph1, ph2, ph3, ...phExtra].find((p) => st.parents.some((x) => x.equals(p._id)));
  await LeaveRequest.create([
    { student: tit._id, class: tit.class, parent: parentOf(tit)._id, fromDate: new Date(excusedDays[0]), toDate: new Date(excusedDays[1]), reason: 'Bé bị sốt siêu vi, gia đình cho nghỉ theo dõi.', status: 'approved', reviewedBy: gv1._id, reviewedAt: new Date(excusedDays[0] - 86400000), reviewNote: 'Chúc bé mau khoẻ' },
    { student: su._id, class: su.class, parent: ph2._id, fromDate: toDateKey(dayjs(TODAY).add(2, 'day').toDate()), toDate: toDateKey(dayjs(TODAY).add(3, 'day').toDate()), reason: 'Gia đình về quê có việc.', status: 'pending' },
    { student: bo._id, class: bo.class, parent: ph3._id, fromDate: toDateKey(dayjs(TODAY).add(1, 'day').toDate()), toDate: toDateKey(dayjs(TODAY).add(1, 'day').toDate()), reason: 'Bé đi khám răng định kỳ.', status: 'pending' },
    { student: bin._id, class: bin.class, parent: ph1._id, fromDate: toDateKey(dayjs(TODAY).subtract(20, 'day').toDate()), toDate: toDateKey(dayjs(TODAY).subtract(20, 'day').toDate()), reason: 'Đi chơi', status: 'rejected', reviewedBy: gv1._id, reviewedAt: dayjs(TODAY).subtract(21, 'day').toDate(), reviewNote: 'Tuần đó có hoạt động dã ngoại, mong ba mẹ cân nhắc' },
  ]);

  /* ---------- Dặn thuốc ---------- */
  const na = students.find((s) => s.nickname === 'Na');
  await MedicineNote.create([
    { student: bin._id, class: bin.class, parent: ph1._id, medicines: [{ name: 'Siro ho Prospan', dosage: '5ml', time: 'Sau ăn trưa' }], fromDate: TODAY, toDate: toDateKey(dayjs(TODAY).add(2, 'day').toDate()), status: 'pending' },
    { student: bo._id, class: bo.class, parent: ph3._id, medicines: [{ name: 'Men tiêu hoá Enterogermina', dosage: '1 ống', time: 'Trước ăn trưa 30 phút', note: 'Lắc đều trước khi uống' }], fromDate: TODAY, toDate: TODAY, status: 'pending' },
    { student: na._id, class: na.class, parent: ph1._id, medicines: [{ name: 'Nhỏ mũi nước muối', dosage: '2 giọt mỗi bên', time: 'Sau ngủ trưa' }], fromDate: toDateKey(dayjs(TODAY).subtract(1, 'day').toDate()), toDate: toDateKey(dayjs(TODAY).add(1, 'day').toDate()), status: 'confirmed', confirmedBy: gv2._id, confirmedAt: dayjs(TODAY).subtract(1, 'day').hour(8).toDate(), logs: [{ givenAt: dayjs(TODAY).subtract(1, 'day').hour(14).toDate(), givenBy: gv2._id, note: 'Bé hợp tác tốt' }] },
    { student: su._id, class: su.class, parent: ph2._id, medicines: [{ name: 'Hạ sốt Hapacol 250', dosage: '1 gói', time: 'Khi sốt trên 38.5°C' }], fromDate: toDateKey(dayjs(TODAY).subtract(6, 'day').toDate()), toDate: toDateKey(dayjs(TODAY).subtract(5, 'day').toDate()), status: 'done', confirmedBy: gv1._id, confirmedAt: dayjs(TODAY).subtract(6, 'day').toDate(), logs: [{ givenAt: dayjs(TODAY).subtract(6, 'day').hour(11).toDate(), givenBy: gv1._id, note: '' }] },
  ]);

  /* ---------- Thông báo ---------- */
  await Notification.create([
    { title: 'Lịch nghỉ lễ', body: 'Trường nghỉ ngày 20/11 nhân Ngày Nhà giáo Việt Nam. Ba mẹ sắp xếp đón bé sớm ngày 19/11.', type: 'school', scope: 'all', sender: ht._id },
    { title: 'Thực đơn tuần mới đã cập nhật', body: 'Ba mẹ xem thực đơn tuần này trong mục Thực đơn.', type: 'school', scope: 'role', targetRole: 'parent', sender: ht._id },
    { title: 'Lớp Lá 2 đi dã ngoại', body: 'Thứ Sáu tuần sau lớp đi công viên. Ba mẹ chuẩn bị mũ và bình nước cho bé.', type: 'class', scope: 'class', targetClass: la2._id, sender: gv1._id },
    { title: 'Nhắc đóng học phí', body: `Học phí ${dayjs(`${MONTH}-01`).format('[tháng] M/YYYY')} đến hạn ngày 10. Ba mẹ thanh toán qua mã QR trong mục Học phí.`, type: 'payment', scope: 'role', targetRole: 'parent', sender: ht._id, link: '/parent/tuitions' },
    { title: 'Kế hoạch giảng dạy chờ duyệt', body: 'Có 2 kế hoạch tuần mới cần hiệu trưởng duyệt.', type: 'system', scope: 'user', targetUsers: [ht._id], link: '/principal/lesson-plans?status=pending' },
  ]);

  /* ---------- Tin nhắn GV ↔ PH ---------- */
  const chat = (a, b, st, lines) =>
    lines.map(([who, content, minutesAgo], i) => ({
      conversationId: conversationIdOf(a._id.toString(), b._id.toString()), sender: (who === 'a' ? a : b)._id, receiver: (who === 'a' ? b : a)._id, student: st._id, content,
      createdAt: dayjs(now).subtract(minutesAgo, 'minute').toDate(), readAt: i < lines.length - 1 ? dayjs(now).subtract(minutesAgo - 1, 'minute').toDate() : null,
    }));
  await Message.insertMany([
    ...chat(gv1, ph1, bin, [
      ['b', 'Cô ơi, hôm nay Bin có ăn được không ạ?', 180],
      ['a', 'Dạ bé ăn hết suất trưa, chiều ăn ít xế một chút thôi ạ.', 170],
      ['b', 'Dạ em cảm ơn cô. Mai em gửi siro ho cho bé nhé.', 160],
      ['a', 'Dạ ba mẹ ghi tên bé lên túi thuốc và tạo dặn thuốc trên app giúp cô nhé.', 150],
      ['b', 'Dạ em đã tạo rồi ạ. Cảm ơn cô!', 5],
    ]),
    ...chat(gv2, ph3, bo, [
      ['a', 'Ba mẹ ơi, Bo hôm nay chơi rất ngoan, cô gửi ảnh trong album nhé.', 60],
      ['b', 'Dạ em cảm ơn cô nhiều ạ!', 40],
    ]),
  ]);

  /* ---------- In danh sách tài khoản ---------- */
  const row = (u, note) => `  ${u.role.padEnd(9)} ${u.email.padEnd(24)} ${PASSWORD}   ${u.fullName}${note ? ` — ${note}` : ''}`;
  console.log('\n✔ Seed xong. Tài khoản demo (mật khẩu đều là 123456, không bắt buộc đổi):');
  console.log(row(admin));
  console.log(row(ht));
  console.log(row(gv1, 'chủ nhiệm Lá 2'));
  console.log(row(gv2, 'chủ nhiệm Chồi 1'));
  console.log(row(ph1, '2 con: Bin (Lá 2), Na (Chồi 1)'));
  console.log(row(ph2, 'con: Su (Lá 2)'));
  console.log(row(ph3, 'con: Bo (Chồi 1)'));
  console.log(`  (6 PH khác: ph4…ph9@kindercare.vn, mỗi người 1 con, cùng mật khẩu)`);
  console.log(`\n  Dữ liệu: ${students.length} bé / 2 lớp, điểm danh + nhận xét ${days.length} ngày, học phí ${MONTH}: 3 paid · 2 partial · 3 unpaid · 2 overdue, 1 giao dịch unmatched.`);
  await disconnectDB();
}

main().catch(async (err) => {
  console.error('Seed lỗi:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
