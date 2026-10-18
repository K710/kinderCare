import { ApiError } from '../utils/ApiError.js';

// Luồng duyệt dùng chung cho Menu / LessonPlan: draft → pending → approved | rejected → (sửa) → draft
export function assertEditable(doc) {
  if (!['draft', 'rejected'].includes(doc.status)) {
    throw ApiError.badRequest('Chỉ sửa được khi ở trạng thái nháp hoặc bị từ chối');
  }
}

export function submit(doc) {
  if (!['draft', 'rejected'].includes(doc.status)) throw ApiError.badRequest('Chỉ gửi duyệt từ nháp / bị từ chối');
  doc.status = 'pending';
  doc.rejectReason = '';
}

export function approve(doc, approverId) {
  if (doc.status !== 'pending') throw ApiError.badRequest('Chỉ duyệt được bản ghi đang chờ duyệt');
  doc.status = 'approved';
  doc.approvedBy = approverId;
  doc.approvedAt = new Date();
  doc.rejectReason = '';
}

export function reject(doc, approverId, reason) {
  if (doc.status !== 'pending') throw ApiError.badRequest('Chỉ từ chối được bản ghi đang chờ duyệt');
  doc.status = 'rejected';
  doc.approvedBy = approverId;
  doc.approvedAt = new Date();
  doc.rejectReason = reason;
}

// Sửa sau khi bị từ chối → quay về nháp
export function touchAfterEdit(doc) {
  if (doc.status === 'rejected') {
    doc.status = 'draft';
    doc.rejectReason = '';
  }
}
