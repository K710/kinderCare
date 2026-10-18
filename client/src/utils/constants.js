// Enum + nhãn tiếng Việt + màu chip theo DESIGN.md (chip luôn kèm icon/chữ, không chỉ màu)
export const ROLES = { ADMIN: 'admin', PRINCIPAL: 'principal', TEACHER: 'teacher', PARENT: 'parent' };

export const ROLE_LABEL = {
  admin: 'Quản trị viên',
  principal: 'Hiệu trưởng',
  teacher: 'Giáo viên',
  parent: 'Phụ huynh',
};

export const ROLE_HOME = { admin: '/admin', principal: '/principal', teacher: '/teacher', parent: '/parent' };

export const AGE_GROUP_LABEL = { nha_tre: 'Nhà trẻ', mam: 'Mầm', choi: 'Chồi', la: 'Lá', all: 'Tất cả' };
export const GENDER_LABEL = { male: 'Nam', female: 'Nữ' };

// tone: leaf | sun | sky | peach | berry | muted
export const ATTENDANCE_STATUS = {
  present: { label: 'Có mặt', tone: 'leaf' },
  late: { label: 'Đi muộn', tone: 'sky' },
  excused: { label: 'Vắng có phép', tone: 'sun' },
  absent: { label: 'Vắng không phép', tone: 'peach' },
  unmarked: { label: 'Chưa điểm danh', tone: 'muted' },
};

export const TUITION_STATUS = {
  paid: { label: 'Đã đóng', tone: 'leaf' },
  partial: { label: 'Đóng một phần', tone: 'sun' },
  unpaid: { label: 'Chưa đóng', tone: 'muted' },
  overdue: { label: 'Quá hạn', tone: 'berry' },
};

export const PAYMENT_STATUS = {
  matched: { label: 'Đã khớp', tone: 'leaf' },
  manual: { label: 'Gán tay', tone: 'sun' },
  unmatched: { label: 'Chưa khớp', tone: 'sky' },
};

export const APPROVAL_STATUS = {
  draft: { label: 'Nháp', tone: 'muted' },
  pending: { label: 'Chờ duyệt', tone: 'sun' },
  approved: { label: 'Đã duyệt', tone: 'leaf' },
  rejected: { label: 'Bị từ chối', tone: 'berry' },
};

export const LEAVE_STATUS = {
  pending: { label: 'Chờ duyệt', tone: 'sun' },
  approved: { label: 'Đã duyệt', tone: 'leaf' },
  rejected: { label: 'Bị từ chối', tone: 'berry' },
};

export const MEDICINE_STATUS = {
  pending: { label: 'Chờ cô xác nhận', tone: 'sun' },
  confirmed: { label: 'Cô đã nhận thuốc', tone: 'sky' },
  done: { label: 'Hoàn tất', tone: 'leaf' },
  cancelled: { label: 'Đã huỷ', tone: 'muted' },
};

export const MEAL_LABEL = { good: 'Ăn hết', normal: 'Ăn vừa', little: 'Ăn ít', none: 'Không ăn' };
export const SLEEP_LABEL = { good: 'Ngủ ngon', normal: 'Bình thường', bad: 'Khó ngủ' };
export const MOOD_LABEL = { happy: 'Vui vẻ', normal: 'Bình thường', sad: 'Buồn', sick: 'Mệt' };
export const DAY_LABEL = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ Nhật' };
