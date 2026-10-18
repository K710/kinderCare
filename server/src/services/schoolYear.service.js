import mongoose from 'mongoose';
import { SchoolYear } from '../models/SchoolYear.js';
import { Class } from '../models/Class.js';
import { Tuition } from '../models/Tuition.js';
import { ApiError } from '../utils/ApiError.js';

export function list() {
  return SchoolYear.find().sort('-startDate');
}

export async function getCurrent() {
  const sy = await SchoolYear.findOne({ isCurrent: true });
  if (!sy) throw ApiError.notFound('Chưa thiết lập năm học hiện tại');
  return sy;
}

export async function getById(id) {
  const sy = await SchoolYear.findById(id);
  if (!sy) throw ApiError.notFound('Không tìm thấy năm học');
  return sy;
}

// Đảm bảo chỉ 1 năm học isCurrent, chạy trong transaction
async function unsetOthers(exceptId, session) {
  await SchoolYear.updateMany({ _id: { $ne: exceptId }, isCurrent: true }, { $set: { isCurrent: false } }, { session });
}

export async function create(data) {
  if (await SchoolYear.exists({ name: data.name })) throw ApiError.conflict('Năm học đã tồn tại');

  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      [created] = await SchoolYear.create([data], { session });
      if (data.isCurrent) await unsetOthers(created._id, session);
    });
    return created;
  } finally {
    await session.endSession();
  }
}

export async function update(id, data) {
  const sy = await getById(id);
  if (data.name && data.name !== sy.name && (await SchoolYear.exists({ name: data.name }))) {
    throw ApiError.conflict('Năm học đã tồn tại');
  }
  const merged = { startDate: sy.startDate, endDate: sy.endDate, ...data };
  if (merged.endDate <= merged.startDate) throw ApiError.badRequest('Ngày kết thúc phải sau ngày bắt đầu');

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      updated = await SchoolYear.findByIdAndUpdate(id, { $set: data }, { new: true, session });
      if (data.isCurrent) await unsetOthers(id, session);
    });
    return updated;
  } finally {
    await session.endSession();
  }
}

export async function setCurrent(id) {
  await getById(id);
  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      await unsetOthers(id, session);
      updated = await SchoolYear.findByIdAndUpdate(id, { $set: { isCurrent: true } }, { new: true, session });
    });
    return updated;
  } finally {
    await session.endSession();
  }
}

export async function remove(id) {
  const sy = await getById(id);
  if (sy.isCurrent) throw ApiError.badRequest('Không thể xoá năm học hiện tại. Đặt năm khác làm hiện tại trước.');
  const [classes, tuitions] = await Promise.all([Class.countDocuments({ schoolYear: id }), Tuition.countDocuments({ schoolYear: id })]);
  if (classes || tuitions) {
    const parts = [];
    if (classes) parts.push(`${classes} lớp`);
    if (tuitions) parts.push(`${tuitions} bản ghi học phí`);
    throw ApiError.badRequest(`Năm học ${sy.name} còn ${parts.join(' và ')}, không thể xoá. Hãy xoá hoặc chuyển dữ liệu trước.`, {
      code: 'SCHOOL_YEAR_IN_USE',
      details: [{ field: 'classes', message: String(classes) }, { field: 'tuitions', message: String(tuitions) }],
    });
  }
  await sy.deleteOne();
}
