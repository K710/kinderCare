# Thiết kế Schema – KinderCare (17 models)

Quy ước chung:
- Mọi model có `timestamps: true` (`createdAt`, `updatedAt`).
- `ObjectId` = `mongoose.Schema.Types.ObjectId` kèm `ref`.
- Xoá mềm (`isActive`) chỉ áp dụng cho User, Class; Student dùng `status`.
- Ngày date-only: xác định ngày theo múi giờ `Asia/Ho_Chi_Minh` (dayjs tz), rồi lưu 00:00 UTC của ngày đó. Cron chạy theo giờ VN.
- Không dùng pre-save hook cho logic nghiệp vụ. BMI, Tuition.amount, paymentCode, SchoolYear.isCurrent được tính trong service (`utils/`, `services/`); model chỉ khai báo trường + index + validate kiểu.
- Trường nhạy cảm (`Student.allergies`, `Student.medicalNotes`) chỉ trả về cho GV lớp, hiệu trưởng, admin, PH của bé; các ngữ cảnh khác dùng `select` loại bỏ.
- `text` index chỉ dùng cho tìm kiếm tên.

---

## 1. User
| Trường | Kiểu | Ghi chú |
|---|---|---|
| fullName | String | required, trim |
| email | String | required, unique, lowercase |
| phone | String | unique sparse |
| password | String | required, bcrypt hash, `select: false` |
| role | String enum `admin\|principal\|teacher\|parent` | required |
| avatar | String | URL Cloudinary |
| avatarPublicId | String | để xoá ảnh cũ |
| isActive | Boolean | default true |
| refreshTokens | [String] | hash refresh token, tối đa 5 thiết bị, `select: false` |
| lastLoginAt | Date | |

Index: `{ email: 1 } unique`, `{ phone: 1 } unique sparse`, `{ role: 1, isActive: 1 }`.
Methods: `comparePassword()`; `toJSON` ẩn password/refreshTokens.
Không lưu `children`; danh sách con của PH lấy từ `Student.parents` (nguồn duy nhất).

## 2. SchoolYear
| Trường | Kiểu | Ghi chú |
|---|---|---|
| name | String | vd "2025-2026", unique |
| startDate | Date | required |
| endDate | Date | required |
| isCurrent | Boolean | default false, chỉ 1 bản ghi true (service `setCurrent` unset các bản khác trong transaction) |
| tuitionDefault | Number | học phí mặc định/tháng (VND) |

Index: `{ name: 1 } unique`, `{ isCurrent: 1 }`.

## 3. Class
| Trường | Kiểu | Ghi chú |
|---|---|---|
| name | String | required, vd "Mầm 1" |
| ageGroup | String enum `nha_tre\|mam\|choi\|la` | required |
| schoolYear | ObjectId → SchoolYear | required |
| teachers | [ObjectId → User] | role teacher, tối đa 3 |
| room | String | phòng học |
| capacity | Number | default 30 |
| isActive | Boolean | default true |

Index: `{ schoolYear: 1, name: 1 } unique`, `{ teachers: 1 }`.
Virtual: `students` (populate ngược từ Student.class).

## 4. Student
| Trường | Kiểu | Ghi chú |
|---|---|---|
| fullName | String | required |
| nickname | String | |
| dateOfBirth | Date | required |
| gender | String enum `male\|female` | required |
| avatar / avatarPublicId | String | |
| class | ObjectId → Class | null = chưa xếp lớp |
| parents | [ObjectId → User] | role parent, ≥1 |
| enrollDate | Date | default now |
| status | String enum `active\|graduated\|left` | default active |
| allergies | [String] | dị ứng thức ăn – nhạy cảm, xem quy ước chung |
| medicalNotes | String | ghi chú sức khoẻ – nhạy cảm |
| emergencyContact | { name, phone, relation } | |

Index: `{ class: 1, status: 1 }`, `{ parents: 1 }`, `{ fullName: 'text' }`.

## 5. Attendance
| Trường | Kiểu | Ghi chú |
|---|---|---|
| student | ObjectId → Student | required |
| class | ObjectId → Class | required (snapshot lớp lúc điểm danh) |
| date | Date | required, 00:00 UTC |
| status | String enum `present\|absent\|late\|excused` | required |
| checkInAt | Date | |
| checkOutAt | Date | |
| note | String | |
| markedBy | ObjectId → User | giáo viên điểm danh |

Index: `{ student: 1, date: 1 } unique`, `{ class: 1, date: 1 }`.

## 6. DailyReport
Nhận xét ngày của giáo viên cho từng bé.
| Trường | Kiểu | Ghi chú |
|---|---|---|
| student | ObjectId → Student | required |
| class | ObjectId → Class | required |
| date | Date | required, 00:00 UTC |
| meals | { breakfast, lunch, snack: enum `good\|normal\|little\|none` } | ăn uống |
| sleep | { duration: Number (phút), quality: enum `good\|normal\|bad` } | |
| mood | String enum `happy\|normal\|sad\|sick` | |
| toilet | Number | số lần đi vệ sinh |
| activities | [String] | hoạt động trong ngày |
| comment | String | nhận xét tự do |
| photos | [String] | URL ảnh nhanh (khác Album) |
| teacher | ObjectId → User | required |
| parentSeenAt | Date | PH đã xem |

Index: `{ student: 1, date: 1 } unique`, `{ class: 1, date: 1 }`.

## 7. HealthRecord
| Trường | Kiểu | Ghi chú |
|---|---|---|
| student | ObjectId → Student | required |
| measuredAt | Date | required |
| height | Number | cm |
| weight | Number | kg |
| bmi | Number | service tính: weight / (height/100)^2, làm tròn 1 chữ số |
| note | String | |
| recordedBy | ObjectId → User | |

Index: `{ student: 1, measuredAt: -1 }`.

## 8. Menu
Thực đơn theo tuần cho một nhóm tuổi, hiệu trưởng duyệt.
| Trường | Kiểu | Ghi chú |
|---|---|---|
| weekStart | Date | thứ 2 đầu tuần, required |
| ageGroup | String enum `nha_tre\|mam\|choi\|la\|all` | default all |
| days | [{ dayOfWeek: 1-5, breakfast: [String], lunch: [String], snack: [String], note }] | 5 ngày |
| status | String enum `draft\|pending\|approved\|rejected` | default draft |
| createdBy | ObjectId → User | |
| approvedBy | ObjectId → User | |
| approvedAt | Date | |
| rejectReason | String | |

Index: `{ weekStart: 1, ageGroup: 1 } unique`, `{ status: 1 }`.

## 9. LessonPlan
| Trường | Kiểu | Ghi chú |
|---|---|---|
| class | ObjectId → Class | required |
| weekStart | Date | required |
| theme | String | chủ đề tuần |
| days | [{ dayOfWeek: 1-5, activities: [{ time, title, goal, materials }] }] | |
| status | String enum `draft\|pending\|approved\|rejected` | default draft |
| teacher | ObjectId → User | required |
| approvedBy / approvedAt / rejectReason | như Menu | |
| attachments | [String] | URL file |

Index: `{ class: 1, weekStart: 1 } unique`, `{ status: 1 }`.

## 10. LeaveRequest
| Trường | Kiểu | Ghi chú |
|---|---|---|
| student | ObjectId → Student | required |
| class | ObjectId → Class | required |
| parent | ObjectId → User | required |
| fromDate | Date | required |
| toDate | Date | required, ≥ fromDate |
| reason | String | required |
| status | String enum `pending\|approved\|rejected` | default pending |
| reviewedBy | ObjectId → User | giáo viên |
| reviewedAt | Date | |
| reviewNote | String | |

Index: `{ class: 1, status: 1, fromDate: -1 }`, `{ student: 1, fromDate: -1 }`.
Service: khi `approved` → tạo Attendance `excused` cho các ngày trong khoảng, bỏ qua T7/CN (giờ VN), không ghi đè Attendance đã có.

## 11. MedicineNote
Dặn thuốc của phụ huynh.
| Trường | Kiểu | Ghi chú |
|---|---|---|
| student | ObjectId → Student | required |
| class | ObjectId → Class | required |
| parent | ObjectId → User | required |
| medicines | [{ name, dosage, time, note }] | ≥1 |
| fromDate / toDate | Date | required |
| status | String enum `pending\|confirmed\|done\|cancelled` | default pending |
| confirmedBy | ObjectId → User | |
| logs | [{ givenAt: Date, givenBy: ObjectId → User, note }] | lịch sử cho uống |

Index: `{ class: 1, status: 1 }`, `{ student: 1, fromDate: -1 }`.

## 12. Tuition
| Trường | Kiểu | Ghi chú |
|---|---|---|
| student | ObjectId → Student | required |
| class | ObjectId → Class | required |
| schoolYear | ObjectId → SchoolYear | required |
| month | String | `YYYY-MM`, required |
| items | [{ name: String, amount: Number }] | học phí, ăn, năng khiếu… |
| amount | Number | tổng phải thu, service tính = Σ items |
| paidAmount | Number | default 0 |
| dueDate | Date | required |
| status | String enum `unpaid\|partial\|paid\|overdue` | default unpaid |
| paymentCode | String | `HP` + 8 ký tự `[A-Z0-9]`, unique, service sinh (`generateCode`), retry nếu trùng |
| note | String | ghi chú (vd thanh toán thừa) |
| createdBy | ObjectId → User | |

Index: `{ paymentCode: 1 } unique`, `{ student: 1, month: 1 } unique`, `{ class: 1, month: 1 }`, `{ status: 1, dueDate: 1 }`.
Cron (service): 00:05 giờ VN mỗi ngày, chuyển `unpaid|partial` có `dueDate` < hôm nay (VN) → `overdue`.

## 13. Payment
Giao dịch nhận từ webhook SePay hoặc ghi tay. Webhook luôn lưu Payment kèm `rawPayload` trước khi xử lý khớp mã; AuditLog chỉ là log phụ.
Khớp mã: regex `HP[A-Z0-9]{8}` trên `content`; tìm thấy đúng 1 mã → khớp Tuition; 0 mã hoặc ≥2 mã → `unmatched` (principal gán tay). Trang thanh toán ghi rõ "mỗi bé chuyển khoản riêng".
| Trường | Kiểu | Ghi chú |
|---|---|---|
| sepayId | Number | id giao dịch SePay, unique sparse (null nếu ghi tay) |
| gateway | String | ngân hàng |
| transactionDate | Date | |
| accountNumber | String | |
| content | String | nội dung CK gốc |
| transferType | String | chỉ lưu `in` |
| amount | Number | transferAmount, required |
| referenceCode | String | |
| paymentCode | String | mã `HP…` tách từ content, có thể null |
| tuition | ObjectId → Tuition | null nếu chưa khớp |
| status | String enum `matched\|unmatched\|manual` | manual = principal gán tay |
| assignedBy | ObjectId → User | principal gán tay |
| assignedAt | Date | |
| rawPayload | Mixed | body webhook gốc, bằng chứng giao dịch (không phụ thuộc AuditLog) |

Index: `{ sepayId: 1 } unique sparse`, `{ tuition: 1 }`, `{ status: 1, transactionDate: -1 }`, `{ paymentCode: 1 }`.

## 14. Notification
| Trường | Kiểu | Ghi chú |
|---|---|---|
| title | String | required |
| body | String | required |
| type | String enum `system\|school\|class\|payment\|leave\|medicine\|report` | |
| scope | String enum `all\|role\|class\|user` | phạm vi gửi |
| targetRole | String | khi scope = role |
| targetClass | ObjectId → Class | khi scope = class |
| targetUsers | [ObjectId → User] | khi scope = user |
| readBy | [ObjectId → User] | người đã đọc |
| link | String | đường dẫn client để mở |
| sender | ObjectId → User | |

Index: `{ scope: 1, targetClass: 1, createdAt: -1 }`, `{ scope: 1, targetRole: 1, createdAt: -1 }`, `{ targetUsers: 1, createdAt: -1 }`.

## 15. Message
Chat 1-1 giữa giáo viên và phụ huynh.
| Trường | Kiểu | Ghi chú |
|---|---|---|
| conversationId | String | `${minId}_${maxId}` (2 userId sắp xếp) |
| sender | ObjectId → User | required |
| receiver | ObjectId → User | required |
| student | ObjectId → Student | ngữ cảnh bé đang trao đổi |
| content | String | |
| attachments | [{ url, type: enum `image\|file` }] | |
| readAt | Date | null = chưa đọc |

Index: `{ conversationId: 1, createdAt: -1 }`, `{ receiver: 1, readAt: 1 }`.

## 16. Album
| Trường | Kiểu | Ghi chú |
|---|---|---|
| title | String | required |
| description | String | |
| class | ObjectId → Class | required |
| date | Date | ngày hoạt động |
| photos | [{ url, publicId, caption }] | Cloudinary |
| createdBy | ObjectId → User | |

Index: `{ class: 1, date: -1 }`.

## 17. AuditLog
| Trường | Kiểu | Ghi chú |
|---|---|---|
| user | ObjectId → User | null với webhook |
| action | String | vd `LOGIN`, `CREATE_TUITION`, `SEPAY_WEBHOOK` |
| resource | String | tên model |
| resourceId | ObjectId | |
| method / path | String | HTTP |
| ip / userAgent | String | |
| payload | Mixed | body đã lược password |
| statusCode | Number | |

Index: `{ user: 1, createdAt: -1 }`, `{ action: 1, createdAt: -1 }`, TTL `{ createdAt: 1 }` 180 ngày.

---

## Sơ đồ quan hệ (tóm tắt)
```
SchoolYear 1─n Class 1─n Student n─n User(parent)
Class n─n User(teacher)
Student 1─n Attendance / DailyReport / HealthRecord / LeaveRequest / MedicineNote / Tuition
Tuition 1─n Payment
Class 1─n Album / LessonPlan
Menu độc lập (theo tuần + ageGroup)
Notification → scope (all / role / class / user)
Message: User ↔ User (conversationId)
```
