import mongoose from 'mongoose';
import { Tuition } from '../models/Tuition.js';
import { Student } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { SchoolYear } from '../models/SchoolYear.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { paymentCode } from '../utils/generateCode.js';
import { toDateKey, todayKey } from '../utils/date.js';
import { escapeRegex } from '../validators/common.validator.js';
import { writeAudit } from '../middlewares/auditLog.js';

const POP = [
  { path: 'student', select: 'fullName nickname avatar' },
  { path: 'class', select: 'name' },
];

const sum = (items) => items.reduce((s, i) => s + i.amount, 0);

// Hàm DUY NHẤT quyết định trạng thái học phí; applyPayment, cron, sửa dueDate đều dùng
export function computeStatus(amount, paidAmount, dueDate, today = todayKey()) {
  if (paidAmount >= amount) return 'paid';
  if (toDateKey(dueDate) < today) return 'overdue';
  return paidAmount > 0 ? 'partial' : 'unpaid';
}

// Sinh mã HP duy nhất, thử lại nếu trùng (xác suất rất thấp)
export async function uniquePaymentCode(session) {
  for (let i = 0; i < 5; i++) {
    const code = paymentCode();
    if (!(await Tuition.exists({ paymentCode: code }).session(session || null))) return code;
  }
  throw new ApiError(500, 'Không sinh được mã thanh toán, thử lại');
}

async function currentSchoolYearId() {
  const sy = await SchoolYear.findOne({ isCurrent: true }).select('_id');
  if (!sy) throw ApiError.badRequest('Chưa thiết lập năm học hiện tại');
  return sy._id;
}

export async function list(query) {
  const pg = parsePagination(query, { defaultSort: '-month' });
  const filter = {};
  if (query.class) filter.class = query.class;
  if (query.month) filter.month = query.month;
  if (query.status) filter.status = query.status;
  if (query.student) filter.student = query.student;
  if (query.search) {
    // Tìm theo tên bé hoặc mã thanh toán
    const rx = new RegExp(escapeRegex(query.search), 'i');
    const ids = (await Student.find({ fullName: rx }).select('_id').lean()).map((s) => s._id);
    filter.$or = [{ student: { $in: ids } }, { paymentCode: rx }];
  }
  const [items, total] = await Promise.all([
    Tuition.find(filter).populate(POP).sort(pg.sort).skip(pg.skip).limit(pg.limit),
    Tuition.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

// Học phí các con của PH
export async function my(parentId, query) {
  const kids = (await Student.find({ parents: parentId }).select('_id').lean()).map((s) => s._id);
  const filter = { student: { $in: kids } };
  if (query.month) filter.month = query.month;
  if (query.status) filter.status = query.status;
  return Tuition.find(filter).populate(POP).sort('-month');
}

export async function getById(id) {
  const t = await Tuition.findById(id).populate(POP).populate('schoolYear', 'name').populate('createdBy', 'fullName');
  if (!t) throw ApiError.notFound('Không tìm thấy học phí');
  return t;
}

export async function create(user, data) {
  const st = await Student.findById(data.student).select('class status');
  if (!st || st.status !== 'active' || !st.class) throw ApiError.badRequest('Học sinh không hợp lệ hoặc chưa xếp lớp');
  if (await Tuition.exists({ student: data.student, month: data.month })) {
    throw ApiError.conflict('Bé đã có học phí tháng này');
  }
  const t = await Tuition.create({
    ...data,
    class: st.class,
    schoolYear: await currentSchoolYearId(),
    amount: sum(data.items),
    dueDate: toDateKey(data.dueDate),
    paymentCode: await uniquePaymentCode(),
    createdBy: user.id,
  });
  return getById(t._id);
}

// Tạo hàng loạt cho cả lớp: bé đã có học phí tháng đó thì bỏ qua
export async function bulkCreate(user, { class: classId, month, items, dueDate }) {
  const cls = await Class.findById(classId).select('isActive');
  if (!cls || !cls.isActive) throw ApiError.notFound('Không tìm thấy lớp');
  const schoolYear = await currentSchoolYearId();
  const students = await Student.find({ class: classId, status: 'active' }).select('_id fullName').lean();
  const existing = new Set(
    (await Tuition.find({ student: { $in: students.map((s) => s._id) }, month }).select('student').lean()).map((t) => t.student.toString()),
  );
  const targets = students.filter((s) => !existing.has(s._id.toString()));
  const skipped = students.filter((s) => existing.has(s._id.toString())).map((s) => ({ student: s._id, fullName: s.fullName }));

  const docs = [];
  for (const s of targets) {
    docs.push({
      student: s._id,
      class: classId,
      schoolYear,
      month,
      items,
      amount: sum(items),
      dueDate: toDateKey(dueDate),
      paymentCode: await uniquePaymentCode(),
      createdBy: user.id,
    });
  }
  if (docs.length) await Tuition.insertMany(docs);
  return { created: docs.length, skipped, total: students.length };
}

// Sửa khoản thu. Đã có tiền vào → bắt buộc lý do, amount mới ≥ paidAmount, ghi AuditLog chi tiết
export async function update(id, data, actor) {
  const t = await Tuition.findById(id);
  if (!t) throw ApiError.notFound('Không tìm thấy học phí');
  const before = { items: t.items.toObject(), amount: t.amount, dueDate: t.dueDate, status: t.status, note: t.note };
  const adjusting = t.paidAmount > 0 && (data.items || data.dueDate);
  if (adjusting && !data.reason) {
    throw ApiError.badRequest('Học phí đã có thanh toán, cần ghi lý do điều chỉnh', { code: 'REASON_REQUIRED' });
  }
  if (data.items) {
    const newAmount = sum(data.items);
    if (newAmount < t.paidAmount) {
      throw ApiError.badRequest(`Tổng mới (${newAmount.toLocaleString('vi-VN')}đ) phải ≥ số đã thu (${t.paidAmount.toLocaleString('vi-VN')}đ)`);
    }
    t.items = data.items;
    t.amount = newAmount;
  }
  if (data.dueDate) t.dueDate = toDateKey(data.dueDate);
  if (data.note !== undefined) t.note = data.note;
  t.status = computeStatus(t.amount, t.paidAmount, t.dueDate);
  await t.save();
  if (adjusting) {
    await writeAudit({
      user: actor?.id || null,
      action: 'ADJUST_TUITION',
      resource: 'Tuition',
      resourceId: t._id,
      payload: { reason: data.reason, before, after: { items: t.items.toObject(), amount: t.amount, dueDate: t.dueDate, status: t.status, note: t.note } },
    });
  }
  return getById(id);
}

export async function remove(id) {
  const t = await Tuition.findById(id);
  if (!t) throw ApiError.notFound('Không tìm thấy học phí');
  if (t.paidAmount > 0) throw ApiError.badRequest('Học phí đã có thanh toán, không thể xoá');
  await t.deleteOne();
}

// Tổng hợp thu theo tháng (toàn trường hoặc 1 lớp)
export async function summary({ month, class: classId }) {
  const match = { month };
  if (classId) match.class = new mongoose.Types.ObjectId(classId);
  const [row] = await Tuition.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalPaid: { $sum: '$paidAmount' },
        unpaid: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] } },
        partial: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);
  const base = row || { count: 0, totalAmount: 0, totalPaid: 0, unpaid: 0, partial: 0, paid: 0, overdue: 0 };
  return { month, ...base, remaining: base.totalAmount - base.totalPaid };
}

/**
 * Cộng tiền vào học phí (GĐ4 gọi trong transaction):
 * đủ → paid, thiếu → partial, thừa → paid + ghi chú. Trả về tuition sau cập nhật.
 */
export async function applyPayment(tuitionId, amount, { session, source = 'SePay' } = {}) {
  const t = await Tuition.findById(tuitionId).session(session || null);
  if (!t) throw ApiError.notFound('Không tìm thấy học phí');
  const next = t.paidAmount + amount; // amount âm = gỡ gán giao dịch
  if (next < 0) throw ApiError.badRequest('Số đã thu không thể âm');
  t.paidAmount = next;
  if (amount > 0 && t.paidAmount > t.amount) {
    // Phần thừa do chính giao dịch này gây ra
    const over = Math.min(amount, t.paidAmount - t.amount);
    t.note = [t.note, `Thanh toán thừa ${over.toLocaleString('vi-VN')}đ (${source})`].filter(Boolean).join('. ');
  }
  t.status = computeStatus(t.amount, t.paidAmount, t.dueDate);
  await t.save({ session });
  return t;
}

// Cron: unpaid/partial quá hạn → overdue
export async function markOverdue(today = todayKey()) {
  const candidates = await Tuition.find({ status: { $ne: 'paid' }, dueDate: { $lt: today } }).select('amount paidAmount dueDate status');
  let n = 0;
  for (const t of candidates) {
    const status = computeStatus(t.amount, t.paidAmount, t.dueDate, today);
    if (status !== t.status) {
      await Tuition.updateOne({ _id: t._id }, { $set: { status } });
      n++;
    }
  }
  return n;
}
