import { Attendance } from '../models/Attendance.js';
import { Student, STUDENT_PUBLIC_SELECT } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { toDateKey, monthRange, todayKey } from '../utils/date.js';

const STUDENT_FIELDS = 'fullName nickname avatar';

// Điểm danh 1 ngày của lớp: trả về đủ danh sách HS, bé chưa điểm danh có status null
export async function listByClass(query) {
  if (query.date) {
    const date = toDateKey(query.date);
    const [students, records] = await Promise.all([
      Student.find({ class: query.class, status: 'active' }).select(STUDENT_FIELDS).sort('fullName').lean(),
      Attendance.find({ class: query.class, date }).lean(),
    ]);
    const map = new Map(records.map((r) => [r.student.toString(), r]));
    return {
      date,
      items: students.map((s) => ({ student: s, attendance: map.get(s._id.toString()) || null })),
    };
  }

  // Khoảng ngày: trả bản ghi thô, client tự nhóm
  const from = toDateKey(query.from);
  const to = toDateKey(query.to);
  if (to < from) throw ApiError.badRequest('to phải ≥ from');
  const items = await Attendance.find({ class: query.class, date: { $gte: from, $lte: to } })
    .populate('student', STUDENT_FIELDS)
    .sort('date student')
    .lean();
  return { from, to, items };
}

export async function studentHistory(studentId, month) {
  const filter = { student: studentId };
  if (month) {
    const { from, to } = monthRange(month);
    filter.date = { $gte: from, $lt: to };
  }
  const items = await Attendance.find(filter).sort('-date').lean();
  const summary = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of items) summary[r.status]++;
  return { items, summary };
}

// Điểm danh cả lớp (upsert theo student+date). Không cho điểm danh ngày tương lai.
export async function bulkMark(user, { class: classId, date, records }) {
  const dateKey = toDateKey(date);
  if (dateKey > todayKey()) throw ApiError.badRequest('Không thể điểm danh ngày tương lai');

  const cls = await Class.findById(classId).select('isActive');
  if (!cls || !cls.isActive) throw ApiError.notFound('Không tìm thấy lớp');

  const ids = [...new Set(records.map((r) => r.student))];
  const n = await Student.countDocuments({ _id: { $in: ids }, class: classId, status: 'active' });
  if (n !== ids.length) throw ApiError.badRequest('Có học sinh không thuộc lớp này');

  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: r.student, date: dateKey },
      update: {
        $set: {
          class: classId,
          status: r.status,
          checkInAt: r.checkInAt ?? null,
          checkOutAt: r.checkOutAt ?? null,
          note: r.note ?? '',
          markedBy: user.id,
        },
      },
      upsert: true,
    },
  }));
  const res = await Attendance.bulkWrite(ops, { ordered: false });
  return { created: res.upsertedCount, updated: res.modifiedCount, total: records.length };
}

export async function update(doc, data) {
  Object.assign(doc, data);
  await doc.save();
  return doc;
}

// Thống kê chuyên cần theo lớp trong tháng
export async function stats({ month, class: classId }) {
  const { from, to } = monthRange(month);
  const match = { date: { $gte: from, $lt: to } };
  if (classId) match.class = new Attendance.base.Types.ObjectId(classId);

  const rows = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: { class: '$class', status: '$status' }, n: { $sum: 1 } } },
    {
      $group: {
        _id: '$_id.class',
        counts: { $push: { k: '$_id.status', v: '$n' } },
        total: { $sum: '$n' },
      },
    },
    { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'cls' } },
    { $unwind: '$cls' },
    {
      $project: {
        _id: 0,
        class: { _id: '$_id', name: '$cls.name', ageGroup: '$cls.ageGroup' },
        total: 1,
        counts: { $arrayToObject: '$counts' },
      },
    },
    { $sort: { 'class.name': 1 } },
  ]);

  return rows.map((r) => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, ...r.counts };
    const attended = c.present + c.late;
    return { ...r, counts: c, rate: r.total ? Math.round((attended / r.total) * 1000) / 10 : 0 };
  });
}

export { STUDENT_PUBLIC_SELECT };
