# Danh sách API – KinderCare

Prefix: `/api/v1`. Response chuẩn: `{ success, data, message, pagination? }`.
Ký hiệu quyền: **A** admin, **P** principal, **T** teacher, **PH** parent, **Pub** công khai.
Quy tắc dữ liệu: T chỉ thao tác lớp mình phụ trách, PH chỉ xem con mình (middleware `checkOwnership`).
Query list chung: `?page=1&limit=20&sort=-createdAt&search=`.

---

## 1. Auth – `/auth`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | /login | Pub | email/phone + password → access + refresh (cookie httpOnly) |
| POST | /refresh | Pub | cấp access mới từ refresh token |
| POST | /logout | Tất cả | thu hồi refresh token hiện tại |
| GET | /me | Tất cả | thông tin user đăng nhập (+ danh sách con từ Student.parents nếu PH) |
| PATCH | /me | Tất cả | đổi fullName, phone, avatar |
| PATCH | /me/password | Tất cả | đổi mật khẩu |
| POST | /register | A | tạo tài khoản (không mở đăng ký công khai) |

## 2. Users – `/users`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P | danh sách, filter `role, isActive, search` |
| GET | /:id | A, P | chi tiết |
| POST | / | A | tạo user, mật khẩu tạm |
| PATCH | /:id | A | sửa thông tin, role |
| PATCH | /:id/status | A | khoá / mở `isActive` |
| POST | /:id/reset-password | A | đặt lại mật khẩu |
| GET | /teachers | A, P | danh sách giáo viên (chọn khi tạo lớp) |
| GET | /parents | A, P, T | tìm phụ huynh theo tên/sđt (gán vào Student) |

## 3. SchoolYears – `/school-years`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | Tất cả | danh sách |
| GET | /current | Tất cả | năm học hiện tại |
| POST | / | A | tạo |
| PATCH | /:id | A | sửa |
| PATCH | /:id/set-current | A | đặt làm năm học hiện tại |
| DELETE | /:id | A | xoá nếu chưa có Class |

## 4. Classes – `/classes`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T | A/P tất cả; T chỉ lớp mình. Filter `schoolYear, ageGroup` |
| GET | /:id | A, P, T*, PH* | T* lớp mình; PH* lớp của con |
| GET | /:id/students | A, P, T* | học sinh trong lớp |
| POST | / | A, P | tạo lớp |
| PATCH | /:id | A, P | sửa tên, phòng, sĩ số |
| PATCH | /:id/teachers | A, P | gán / gỡ giáo viên |
| POST | /:id/students | A, P | thêm nhiều học sinh vào lớp |
| DELETE | /:id/students/:studentId | A, P | chuyển bé ra khỏi lớp |
| DELETE | /:id | A, P | xoá mềm |

## 5. Students – `/students`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T | T chỉ học sinh lớp mình. Filter `class, status, search` |
| GET | /my-children | PH | danh sách con |
| GET | /:id | A, P, T*, PH* | chi tiết |
| POST | / | A, P | tạo hồ sơ bé |
| PATCH | /:id | A, P | sửa |
| PATCH | /:id/avatar | A, P, T* | upload ảnh đại diện (multer) |
| PATCH | /:id/parents | A, P | gán / gỡ phụ huynh |
| PATCH | /:id/status | A, P | active / graduated / left |

## 6. Attendance – `/attendance`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T* | `?class=&date=` hoặc `?class=&from=&to=` |
| GET | /student/:studentId | A, P, T*, PH* | lịch sử điểm danh 1 bé, `?month=YYYY-MM` |
| POST | /bulk | T* | điểm danh cả lớp 1 ngày: `{ class, date, records: [{student, status, note}] }` (upsert) |
| PATCH | /:id | T* | sửa 1 bản ghi (check-in/out, note) |
| GET | /stats | A, P | tỉ lệ chuyên cần theo lớp/tháng |

## 7. Daily Reports – `/daily-reports`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T* | `?class=&date=` |
| GET | /student/:studentId | A, P, T*, PH* | lịch sử nhận xét 1 bé, `?from=&to=` |
| GET | /:id | A, P, T*, PH* | chi tiết |
| POST | / | T* | tạo nhận xét (1 bé / 1 ngày) |
| POST | /bulk | T* | tạo nhanh cho cả lớp cùng nội dung chung |
| PATCH | /:id | T* | sửa |
| PATCH | /:id/seen | PH* | đánh dấu đã xem |
| DELETE | /:id | T* | xoá |

## 8. Health Records – `/health-records`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | /student/:studentId | A, P, T*, PH* | lịch sử đo (dữ liệu biểu đồ) |
| POST | / | T* | thêm lần đo |
| POST | /bulk | T* | đo cả lớp |
| PATCH | /:id | T* | sửa |
| DELETE | /:id | T* | xoá |

## 9. Menus – `/menus`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T | filter `status, ageGroup, weekStart` |
| GET | /current | T, PH | thực đơn tuần hiện tại đã duyệt (PH theo ageGroup lớp con) |
| GET | /:id | A, P, T, PH | chi tiết (PH chỉ approved) |
| POST | / | P | tạo (draft) |
| PATCH | /:id | P | sửa khi draft/rejected |
| PATCH | /:id/submit | P | draft → pending |
| PATCH | /:id/approve | P | pending → approved |
| PATCH | /:id/reject | P | pending → rejected + lý do |
| DELETE | /:id | P | xoá draft |

## 10. Lesson Plans – `/lesson-plans`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T* | filter `class, status, weekStart` |
| GET | /:id | A, P, T*, PH* | chi tiết (PH chỉ approved) |
| POST | / | T* | tạo (draft) |
| PATCH | /:id | T* | sửa khi draft/rejected |
| PATCH | /:id/submit | T* | gửi duyệt |
| PATCH | /:id/approve | P | duyệt |
| PATCH | /:id/reject | P | từ chối + lý do |
| DELETE | /:id | T* | xoá draft |

## 11. Leave Requests – `/leave-requests`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T* | filter `class, status` |
| GET | /my | PH | đơn của con mình |
| GET | /:id | A, P, T*, PH* | chi tiết |
| POST | / | PH* | tạo đơn |
| PATCH | /:id | PH* | sửa khi pending |
| PATCH | /:id/approve | T* | duyệt → tạo Attendance excused |
| PATCH | /:id/reject | T* | từ chối + ghi chú |
| DELETE | /:id | PH* | huỷ khi pending |

## 12. Medicine Notes – `/medicine-notes`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T* | filter `class, status, date` |
| GET | /my | PH | dặn thuốc của con mình |
| GET | /:id | A, P, T*, PH* | chi tiết |
| POST | / | PH* | tạo |
| PATCH | /:id | PH* | sửa khi pending |
| PATCH | /:id/confirm | T* | xác nhận đã nhận thuốc |
| POST | /:id/logs | T* | ghi 1 lần cho uống |
| PATCH | /:id/done | T* | hoàn tất |
| PATCH | /:id/cancel | PH* | huỷ |

## 13. Tuitions – `/tuitions`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P | filter `class, month, status, search` |
| GET | /my | PH | học phí các con, `?month=` |
| GET | /:id | A, P, PH* | chi tiết + danh sách Payment |
| POST | / | P | tạo 1 bản ghi |
| POST | /bulk | P | tạo hàng loạt theo lớp: `{ class, month, items, dueDate }` → mỗi bé 1 Tuition |
| PATCH | /:id | P | sửa items/dueDate khi chưa có Payment |
| DELETE | /:id | P | xoá khi unpaid và chưa có Payment |
| GET | /summary | P | tổng thu / phải thu theo tháng, lớp |
| GET | /export | P | xuất Excel (GĐ7) |

## 14. Payments – `/payments`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | /sepay-webhook | Pub* | *không JWT*, header `Authorization: Apikey {KEY}`, rate-limit riêng |
| GET | /status/:paymentCode | PH*, P | trạng thái Tuition + Payment mới nhất (polling 5s) |
| GET | /qr/:tuitionId | PH*, P | `{ qrUrl, account, bank, accountName, amount, paymentCode }` |
| GET | / | P | danh sách giao dịch, filter `status, from, to` |
| GET | /unmatched | P | giao dịch chưa khớp |
| PATCH | /:id/assign | P | gán tay vào Tuition → status `manual`, cập nhật Tuition (transaction) |
| POST | /manual | P | ghi nhận thu tiền mặt cho Tuition |
| GET | /export | P | xuất báo cáo thu (GĐ7) |

## 15. Notifications – `/notifications`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | Tất cả | thông báo của tôi (theo scope), `?unread=true` |
| GET | /unread-count | Tất cả | số chưa đọc (badge) |
| PATCH | /:id/read | Tất cả | đánh dấu đọc |
| PATCH | /read-all | Tất cả | đọc tất cả |
| POST | / | A, P, T* | A/P: scope all/role/class; T: chỉ scope class của mình |
| DELETE | /:id | A, P | xoá |

## 16. Messages – `/messages`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | /conversations | T, PH | danh sách hội thoại + tin cuối + số chưa đọc |
| GET | /contacts | T, PH | T: PH của lớp mình; PH: GV lớp của con |
| GET | /:userId | T, PH | lịch sử chat với 1 người, phân trang cursor `?before=` |
| POST | / | T, PH | gửi tin (REST, Socket emit song song) |
| PATCH | /:userId/read | T, PH | đánh dấu đã đọc toàn hội thoại |
| POST | /upload | T, PH | upload file đính kèm |

## 17. Albums – `/albums`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A, P, T*, PH* | filter `class, from, to` |
| GET | /:id | A, P, T*, PH* | chi tiết |
| POST | / | T* | tạo album + upload nhiều ảnh (multer array) |
| PATCH | /:id | T* | sửa tiêu đề, mô tả |
| POST | /:id/photos | T* | thêm ảnh |
| DELETE | /:id/photos/:photoId | T* | xoá ảnh (xoá Cloudinary) |
| DELETE | /:id | T* | xoá album |

## 18. Dashboard – `/dashboard`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | /principal | P, A | tổng HS/GV/lớp, chuyên cần hôm nay, học phí tháng, đơn chờ duyệt |
| GET | /teacher | T | lớp mình: sĩ số, điểm danh hôm nay, đơn nghỉ/thuốc chờ |
| GET | /parent | PH | theo con: điểm danh hôm nay, nhận xét mới, học phí chưa đóng |
| GET | /admin | A | số tài khoản theo role, đăng nhập gần đây |

## 19. Audit Logs – `/audit-logs`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | / | A | filter `user, action, from, to` |
| GET | /:id | A | chi tiết payload |

## 20. Upload – `/upload`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | /image | Tất cả | upload 1 ảnh → Cloudinary `{ url, publicId }` |
| POST | /images | T, P | upload nhiều ảnh |

---

## Socket.IO events
Kết nối kèm access token (`auth.token`). Server join room theo `user:{userId}`, `class:{classId}`, `role:{role}`.
| Event (server → client) | Room | Payload |
|---|---|---|
| `notification:new` | user / class / role | Notification |
| `message:new` | user:{receiverId} | Message |
| `message:read` | user:{senderId} | `{ conversationId, readAt }` |
| `payment:success` | user:{parentId} | `{ tuitionId, paymentCode, amount, status }` |
| `leave:updated` / `medicine:updated` | user:{parentId} | bản ghi |

| Event (client → server) | Mô tả |
|---|---|
| `message:send` | gửi tin (fallback REST) |
| `message:typing` | đang gõ |

## Mã lỗi
| HTTP | Ý nghĩa |
|---|---|
| 400 | validation (Zod/Joi) |
| 401 | chưa đăng nhập / token hết hạn (`TOKEN_EXPIRED` để client refresh) |
| 403 | sai role hoặc không sở hữu dữ liệu |
| 404 | không tìm thấy |
| 409 | trùng (email, paymentCode, điểm danh cùng ngày) |
| 429 | rate-limit |
| 500 | lỗi server |
