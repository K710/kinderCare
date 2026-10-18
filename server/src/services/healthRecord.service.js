import { HealthRecord } from '../models/HealthRecord.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { toDateKey } from '../utils/date.js';

// BMI = kg / m², làm tròn 1 chữ số (quy ước: tính ở service, không pre-save)
export const calcBmi = (height, weight) => Math.round((weight / (height / 100) ** 2) * 10) / 10;

// Dữ liệu biểu đồ: tăng dần theo ngày đo + bản ghi mới nhất
export async function listByStudent(studentId) {
  const items = await HealthRecord.find({ student: studentId }).populate('recordedBy', 'fullName').sort('measuredAt');
  return { items, latest: items.at(-1) || null };
}

export async function create(user, { student, measuredAt, height, weight, note }) {
  const st = await Student.findById(student).select('status');
  if (!st || st.status !== 'active') throw ApiError.badRequest('Học sinh không hợp lệ');
  return HealthRecord.create({
    student,
    measuredAt: toDateKey(measuredAt),
    height,
    weight,
    bmi: calcBmi(height, weight),
    note,
    recordedBy: user.id,
  });
}

// Đo cả lớp cùng ngày; bé đã có bản ghi ngày đó thì cập nhật
export async function bulkCreate(user, { class: classId, measuredAt, records }) {
  const dateKey = toDateKey(measuredAt);
  const ids = [...new Set(records.map((r) => r.student))];
  const n = await Student.countDocuments({ _id: { $in: ids }, class: classId, status: 'active' });
  if (n !== ids.length) throw ApiError.badRequest('Có học sinh không thuộc lớp này');

  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: r.student, measuredAt: dateKey },
      update: {
        $set: { height: r.height, weight: r.weight, bmi: calcBmi(r.height, r.weight), note: r.note ?? '', recordedBy: user.id },
      },
      upsert: true,
    },
  }));
  const res = await HealthRecord.bulkWrite(ops, { ordered: false });
  return { created: res.upsertedCount, updated: res.modifiedCount, total: records.length };
}

export async function update(doc, data) {
  if (data.measuredAt) data.measuredAt = toDateKey(data.measuredAt);
  Object.assign(doc, data);
  doc.bmi = calcBmi(doc.height, doc.weight);
  await doc.save();
  return doc;
}

export async function remove(doc) {
  await doc.deleteOne();
}
