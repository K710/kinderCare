import { DailyReport } from '../models/DailyReport.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { toDateKey, todayKey, dayjs } from '../utils/date.js';

const STUDENT_FIELDS = 'fullName nickname avatar';
const TEACHER_FIELDS = 'fullName avatar honorific';

// Danh sách HS lớp + nhận xét của ngày (null nếu chưa có)
export async function listByClass({ class: classId, date }) {
  const dateKey = toDateKey(date);
  const [students, reports] = await Promise.all([
    Student.find({ class: classId, status: 'active' }).select(STUDENT_FIELDS).sort('fullName').lean(),
    DailyReport.find({ class: classId, date: dateKey }).lean(),
  ]);
  const map = new Map(reports.map((r) => [r.student.toString(), r]));
  return { date: dateKey, items: students.map((s) => ({ student: s, report: map.get(s._id.toString()) || null })) };
}

// Lịch sử nhận xét 1 bé, mặc định 30 ngày gần nhất
export async function listByStudent(studentId, { from, to }) {
  const toKey = toDateKey(to || new Date());
  const fromKey = toDateKey(from || dayjs(toKey).subtract(30, 'day').toDate());
  if (toKey < fromKey) throw ApiError.badRequest('to phải ≥ from');
  return DailyReport.find({ student: studentId, date: { $gte: fromKey, $lte: toKey } })
    .populate('teacher', TEACHER_FIELDS)
    .sort('-date');
}

export async function getById(id) {
  const r = await DailyReport.findById(id).populate('student', STUDENT_FIELDS).populate('teacher', TEACHER_FIELDS);
  if (!r) throw ApiError.notFound('Không tìm thấy nhận xét');
  return r;
}

async function activeStudent(studentId) {
  const st = await Student.findById(studentId).select('class status');
  if (!st || st.status !== 'active' || !st.class) throw ApiError.badRequest('Học sinh không hợp lệ hoặc chưa xếp lớp');
  return st;
}

export async function create(user, { student, date, ...content }) {
  const dateKey = toDateKey(date);
  if (dateKey > todayKey()) throw ApiError.badRequest('Không thể nhận xét ngày tương lai');
  const st = await activeStudent(student);
  if (await DailyReport.exists({ student, date: dateKey })) {
    throw ApiError.conflict('Bé đã có nhận xét ngày này, hãy sửa thay vì tạo mới');
  }
  const r = await DailyReport.create({ ...content, student, class: st.class, date: dateKey, teacher: user.id });
  return getById(r._id);
}

// Tạo nhanh cho nhiều bé cùng nội dung chung; bé đã có nhận xét thì cập nhật các trường gửi lên
export async function bulkCreate(user, { class: classId, date, students, ...content }) {
  const dateKey = toDateKey(date);
  if (dateKey > todayKey()) throw ApiError.badRequest('Không thể nhận xét ngày tương lai');
  const ids = [...new Set(students)];
  const n = await Student.countDocuments({ _id: { $in: ids }, class: classId, status: 'active' });
  if (n !== ids.length) throw ApiError.badRequest('Có học sinh không thuộc lớp này');

  const ops = ids.map((student) => ({
    updateOne: {
      filter: { student, date: dateKey },
      update: { $set: { ...content, class: classId, teacher: user.id }, $setOnInsert: { student, date: dateKey } },
      upsert: true,
    },
  }));
  const res = await DailyReport.bulkWrite(ops, { ordered: false });
  return { created: res.upsertedCount, updated: res.modifiedCount, total: ids.length };
}

export async function update(doc, data) {
  Object.assign(doc, data);
  await doc.save();
  return getById(doc._id);
}

export async function markSeen(doc) {
  if (!doc.parentSeenAt) {
    doc.parentSeenAt = new Date();
    await doc.save();
  }
  return doc;
}

export async function remove(doc) {
  await doc.deleteOne();
}
