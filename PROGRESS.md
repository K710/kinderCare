# PROGRESS

**Giai đoạn hiện tại:** 6 (đã xong, chờ duyệt giao diện) → 7
**Task tiếp theo:** 7.1

## GĐ1 – Thiết kế
- [x] 1.1 Schema 17 models (trường, kiểu, ref, index)
- [x] 1.2 Danh sách API theo module + quyền
- [x] 1.3 Cấu trúc thư mục client/server

## GĐ2 – Nền tảng backend
- [x] 2.1 Khởi tạo Express, kết nối Mongo, .env.example
- [x] 2.2 Error handler, response chuẩn, logger
- [x] 2.3 Auth: register/login/refresh/logout, bcrypt
- [x] 2.4 Middleware authenticate, authorize, checkOwnership
- [x] 2.5 Swagger

## GĐ3 – Module backend
- [x] 3.1 User + SchoolYear + Class
- [x] 3.2 Student (gán phụ huynh, lớp)
- [x] 3.3 Attendance
- [x] 3.4 DailyReport + Album (upload)
- [x] 3.5 HealthRecord
- [x] 3.6 Menu + LessonPlan (duyệt)
- [x] 3.7 LeaveRequest + MedicineNote
- [x] 3.8 Tuition (tạo hàng loạt theo lớp, paymentCode)
- [x] 3.9 Notification + Message
- [x] 3.10 AuditLog + thống kê dashboard

## GĐ4 – Thanh toán SePay
- [x] 4.1 Model Payment (sepayId unique, status matched/unmatched)
- [x] 4.2 Webhook: xác thực Apikey, chống trùng, khớp mã, transaction
- [x] 4.3 API trạng thái thanh toán + tạo link QR
- [x] 4.4 API đối soát giao dịch unmatched + gỡ gán (lý do, transaction, AuditLog)
- [x] 4.5 Test webhook cục bộ bằng `npm run sepay:test` (test SePay thật chuyển sang 7.4)

## GĐ5 – Nền tảng frontend
- [x] 5.1 Vite + Tailwind + Router + Zustand
- [x] 5.2 Axios interceptor (refresh token)
- [x] 5.3 Login, ProtectedRoute theo role, 403/404
- [x] 5.4 Layout sidebar/header theo role

## GĐ6 – Giao diện theo vai trò
- [x] 6.1 Admin
- [x] 6.2 Hiệu trưởng (dashboard, học phí, đối soát)
- [x] 6.3 Giáo viên
- [x] 6.4 Phụ huynh (mobile-first, trang thanh toán QR)

## GĐ7 – Hoàn thiện
- [ ] 7.1 Socket.IO (thông báo, chat, payment:success)
- [ ] 7.2 Xuất Excel/PDF
- [x] 7.3 Seed dữ liệu demo (4 tài khoản) (làm sớm theo yêu cầu, trước khi duyệt GĐ6)
- [ ] 7.4 Test SePay thật: nút Gửi thử (ngrok/cloudflared) + 1 giao dịch thật số tiền nhỏ, test trọn luồng từ trang thanh toán của phụ huynh
- [ ] 7.5 README chạy & deploy

## Quyết định
<!-- 1 dòng/quyết định. vd: Dùng Zustand thay Redux vì nhẹ -->
- Payment.status thêm `manual` (principal gán tay) ngoài matched/unmatched.
- Attendance/DailyReport lưu thêm `class` snapshot để query theo lớp không cần join Student.
- Message dùng `conversationId = minId_maxId`, không tạo model Conversation riêng.
- AuditLog dùng TTL index 180 ngày.
- Payment lưu `rawPayload` làm bằng chứng giao dịch, webhook không phụ thuộc AuditLog; gán tay dùng `assignedBy/assignedAt`.
- Không mở đăng ký công khai; admin tạo tài khoản. Validation dùng Zod ở cả server và client.
- Socket room: `user:{id}`, `class:{id}`, `role:{role}`.
- Ngày date-only xác định theo Asia/Ho_Chi_Minh (dayjs tz), lưu 00:00 UTC; cron overdue theo giờ VN.
- Không dùng pre-save cho nghiệp vụ (BMI, Tuition.amount, paymentCode, isCurrent) → tính ở service.
- Webhook: content có 0 hoặc ≥2 mã HP → unmatched; UI ghi "mỗi bé chuyển khoản riêng".
- Bỏ User.children, Student.parents là nguồn duy nhất.
- Notification thêm index { scope, targetRole, createdAt }.
- Duyệt đơn nghỉ: tạo Attendance excused bỏ qua T7/CN, không ghi đè bản ghi đã có.
- allergies/medicalNotes chỉ trả cho GV lớp, HT, admin, PH của bé.
- DESIGN: trạng thái đi muộn (late) dùng màu sky.
- Server dùng ESM (`type: module`), Express 4, winston logger, Zod validate env khi khởi động.
- Mongo dev chạy bằng docker-compose.yml (replica set 1 node) để có transaction.
- Refresh token: cookie httpOnly path /api/v1/auth, hash SHA-256 lưu User.refreshTokens (≤5), xoay vòng mỗi lần refresh; dùng lại token cũ → thu hồi toàn bộ.
- Login nhận `identifier` (email hoặc sđt). Đổi mật khẩu → đăng xuất mọi thiết bị.
- checkOwnership: middleware tổng quát đọc studentId/classId từ params/query/body; checkResourceOwnership cho route /:id của bản ghi con, gắn req.resource.
- Zod dùng locale tiếng Việt toàn cục (config/zod.js). Swagger chỉ bật ngoài production tại /api/docs.
- Test: `npm test` (node:test, tests/*.test.mjs). Có TEST_MONGO_URI → Mongo thật; không → MongoMemoryReplSet.
- Rate-limit login 2 lớp: theo IP (30 lần sai/15p) và theo identifier (10 lần sai/15p, mã LOGIN_LOCKED); cả hai chỉ đếm request thất bại.
- Cookie refresh: sameSite/secure qua env COOKIE_SAMESITE, COOKIE_SECURE; none bắt buộc secure=true.
- Script `npm run create-admin` (CLI hoặc --email/--name/--password).
- Class.remove = xoá mềm, chỉ khi không còn HS active; thêm HS vào lớp = chuyển lớp nếu đang ở lớp khác, kiểm tra capacity.
- Khoá tài khoản / reset mật khẩu → xoá refreshTokens; admin không tự khoá mình.
- Upload: multer memory → Cloudinary stream; chưa cấu hình Cloudinary → 503 UPLOAD_DISABLED. Student status ≠ active → class = null.
- Test chạy tuần tự (--test-concurrency=1); với Mongo thật mỗi file dùng DB `kindercare_test_<pid>`.
- utils/date.js: toDateKey (VN → 00:00 UTC), monthRange, weekStartKey, eachDay(skipWeekend). Điểm danh không cho ngày tương lai; chỉ teacher điểm danh/sửa.
- Album: route multipart chạy multer trước validate/checkOwnership (body chỉ có sau multer); list trả cover + photoCount, không trả mảng photos. Tối đa 100 ảnh/album, 20 ảnh/lần.
- DailyReport.photos là URL (client upload qua /upload/image trước); bulk dùng $setOnInsert để không ghi đè trường cũ.
- approval.service dùng chung Menu/LessonPlan: draft→pending→approved|rejected; sửa khi rejected → về draft; không xoá bản đã duyệt. weekStart luôn chuẩn hoá về thứ 2 (VN).
- /menus/current: trả theo nhóm tuổi liên quan user, ưu tiên bản riêng nhóm, fallback bản 'all'.
- LeaveRequest: chặn trùng khoảng ngày với đơn pending/approved cùng bé (409); PH chỉ sửa/huỷ đơn mình tạo khi pending. Approve dùng upsert $setOnInsert để không ghi đè Attendance.
- MedicineNote: PH sửa chỉ khi pending, huỷ khi pending/confirmed; chỉ người tạo mới sửa/huỷ; log cho uống chỉ khi confirmed.
- [Thanh toán – đã duyệt 2026-10-18] paymentCode dùng bảng chữ bỏ 0/O/1/I; bulk tạo học phí bỏ qua bé đã có, trả `skipped: [{student, fullName}]`; applyPayment là điểm duy nhất đổi tiền (nhận cả số âm để gỡ gán).
- [Thanh toán – đã duyệt] Trạng thái Tuition luôn tính bằng `computeStatus(amount, paidAmount, dueDate)`: paid nếu đủ, overdue nếu quá hạn, partial/unpaid. applyPayment, cron, sửa dueDate đều dùng.
- [Thanh toán – đã duyệt] HT được sửa Tuition đã có tiền: bắt buộc `reason`, Σ items ≥ paidAmount, ghi AuditLog ADJUST_TUITION (before/after). Xoá vẫn chỉ khi paidAmount = 0.
- [Thanh toán – đã duyệt] Webhook chuẩn hoá content (viết hoa, bỏ khoảng trắng, `-`, `_`) trước khi tìm mã HP. Gỡ gán giao dịch qua applyPayment số âm, trong transaction, bắt buộc lý do, ghi AuditLog UNASSIGN_PAYMENT.
- [Thanh toán] Webhook: lưu Payment (unmatched, rawPayload) TRƯỚC khi khớp; body sai định dạng → 400; content trống → dùng field `code` của SePay; transactionDate SePay là giờ VN. Mọi lần gọi webhook (kể cả 401/503) ghi AuditLog SEPAY_WEBHOOK.
- [Thanh toán] Payment.method bank|cash; tiền mặt = POST /payments/manual (status manual), xoá tiền mặt cần lý do và hoàn tiền; giao dịch ngân hàng chỉ gỡ gán, không xoá. Gán tay yêu cầu giao dịch đang unmatched.
- [Thanh toán] QR: amount = còn phải thu; chưa cấu hình SEPAY_ACCOUNT/BANK → 503. Status API cho PH chỉ học phí con mình.
- [Thanh toán – đã duyệt] Webhook: lưu Payment thất bại (lỗi DB) → 500 để SePay retry; lỗi SAU khi đã lưu (khớp/transaction) → giữ unmatched kèm ghi chú, trả 200.
- Client dùng Tailwind 3.4 (tailwind.config.js) để khớp token `theme.extend.colors` trong DESIGN.md; Vite 5 + React 18 + @vitejs/plugin-react 4.
- Access token chỉ giữ trong bộ nhớ (Zustand, không persist); user persist để render nhanh; khi tải trang gọi /auth/refresh qua cookie (bootstrap). Dev dùng proxy Vite `/api` → :5000 để cookie cùng origin.
- Axios: refresh 1 lần cho nhiều request 401 đồng thời (hàng đợi promise), bỏ qua route login/refresh và lỗi BAD_CREDENTIALS; thất bại → clearSession.
- Router: GuestRoute cho /login, ProtectedRoute(roles) chờ bootstrap (skeleton) → /login kèm state.from → /403; menu + tiêu đề trang khai báo tập trung ở router/menus.js.
- Layout: StaffLayout (sidebar 240 → icon 64 → drawer) cho A/P/T; ParentLayout cột 640 + ChildSwitcher + MobileNav 5 tab (desktop: tab ngang). Toast store dùng chung, chữ toast = chữ nút.
- Fetch dữ liệu bằng hook useFetch/useDebounce/usePagination tự viết (không react-query) để nhẹ; DataTable nhận columns[{key,title,render}], skeleton + empty + Pagination tích hợp.
- Modal là lớp nổi duy nhất có bóng, trên mobile dính đáy như bottom sheet; ConfirmDialog có chế độ requireReason cho thao tác cần lý do (gỡ gán, điều chỉnh học phí).
- Select dùng <select> gốc trình duyệt (tốt trên mobile) thay vì dropdown tự vẽ.
- [Bảo mật – đã duyệt] Admin không tự khoá / tự đổi vai trò (SELF_LOCK, SELF_ROLE_CHANGE); không khoá hoặc hạ vai trò admin đang hoạt động cuối cùng (LAST_ADMIN).
- [Bảo mật – đã duyệt] User.mustChangePassword: bật khi tạo tài khoản và khi đặt lại mật khẩu; authenticate chặn mọi route ngoài /auth/* với mã PASSWORD_CHANGE_REQUIRED; đổi mật khẩu xong tắt cờ và đăng xuất mọi thiết bị. Client: /change-password bắt buộc trước khi vào app.
- [Bảo mật – đã duyệt] Mật khẩu tạm do server sinh (8 ký tự, bỏ 0/O/1/I/l) khi tạo/đặt lại không truyền password; trả trong response đúng 1 lần (tempPassword), client hiện TempPasswordModal có nút sao chép. Đổi mật khẩu mới phải khác mật khẩu hiện tại.
- utils/password.js: MIN_PASSWORD_LENGTH = 8 ở production, 6 ở dev; create-admin (và seed 7.3) dùng assertPasswordPolicy. Validator API vẫn 6.
- Xoá SchoolYear chỉ khi không còn Class và Tuition; lỗi SCHOOL_YEAR_IN_USE nêu rõ số lớp / số bản ghi học phí.
- tuition.service.applyPayment(tuitionId, amount, {session}) là điểm duy nhất đổi paidAmount/status (GĐ4 gọi trong transaction). Cron overdue 00:05 VN (node-cron) khởi động trong index.js.
- sockets/emitter.js: setIO/emitToUsers/emitToClass/emitToRole; service emit không cần biết io đã khởi tạo (GĐ7.1 gọi setIO).
- Notification: list trả cờ isRead thay vì mảng readBy; notify() dùng chung, đã gắn vào leave approve/reject, medicine confirm/log, lessonPlan approve/reject. GV chỉ gửi scope class lớp mình.
- Message: chỉ T↔PH có bé chung (canChat); history phân trang cursor ?before; chat chỉ cho role teacher/parent.
- AuditLog: middleware audit(action, resource) ghi sau res.finish (không chặn request), mặc định chỉ 2xx, LOGIN ghi cả thất bại; che password/token; list không trả payload. Gắn vào auth, users, school-years, classes, students, tuitions, notifications.
- Dashboard: 4 endpoint theo role, tái dùng tuition.summary / notification.unreadCount / message.unreadTotal.
- DataTable < 768px tự chuyển dạng thẻ (cột `card: header|chip|meta|false`); cột `actions(row)` → desktop nút icon (IconButton có tooltip + aria-label), mobile gom vào ActionMenu "⋯". Áp dụng cho mọi bảng.
- Dashboard HT trả thêm `attendanceTrend` (30 ngày, bỏ T7/CN, toàn trường) thay vì thêm endpoint riêng; client dùng recharts (tách chunk `charts`) cho biểu đồ.
- EntityPicker (components/shared) dùng chung để chọn GV/PH/bé qua ô tìm; trang Thông báo dùng chung cho admin + HT (features/notifications).
- GV nhiều lớp: lớp đang chọn lưu `ui.store.selectedClassId` (hook useMyClasses); điểm danh chạm = có mặt, giữ 450ms / nút ⋯ = chọn trạng thái; chỉ gửi bé đã đánh dấu.
- GrowthChart (components/shared) nhúng bảng WHO xấp xỉ (−2SD/trung vị/+2SD, 12–72 tháng) nội suy tuyến tính, dùng chung GV + PH; ghi rõ chỉ tham khảo.
- Chat dùng chung GV/PH (features/chat), poll 10s lịch sử + 20s hội thoại cho tới khi có socket (7.1); ảnh nhận xét upload qua /upload/images lấy URL.
- PH: bé đang chọn lấy từ `user.children` (/auth/me) + `ui.store.selectedChildId` (hook useSelectedChild); trang thanh toán poll /payments/status 5s tối đa 15 phút, QR cập nhật theo số còn lại; biên lai dùng /tuitions/:id + lastPayment từ status (PH không có quyền list Payment).
- Trang ngoài 5 tab PH (album, thực đơn, tăng trưởng, xin nghỉ, dặn thuốc, thông báo) mở từ lối tắt trang chủ, header có nút quay lại; link thông báo `/parent/*/:id` trỏ về trang danh sách.
- Seed (`npm run seed`, chỉ dev, từ chối production trừ --force): XOÁ TOÀN BỘ DB rồi tạo lại demo (1 admin, 1 HT, 2 GV, 3 PH chính + 6 PH phụ, 2 lớp, 10 bé, 10 ngày điểm danh/nhận xét, 8 tháng cân đo, thực đơn, kế hoạch, album, học phí đủ trạng thái, 1 unmatched, đơn nghỉ, dặn thuốc, tin nhắn); PRNG cố định để lặp lại giống nhau.
- [Thanh toán – cần xác nhận] Payment.sepayId: đổi unique sparse → unique partial (`$type: number`). Lý do: sparse không bỏ qua `null`, giao dịch tiền mặt thứ hai bị E11000; thêm test hồi quy.
- GrowthChart dùng dữ liệu WHO gốc: utils/whoGrowth.js chứa tham số LMS 0–60 tháng (weight-for-age, length/height-for-age, theo giới) tải từ who.int, tính giá trị tại z bằng công thức LMS + z-score lần đo gần nhất; ghi nguồn dưới biểu đồ.
- Hồ sơ user trả cho client (login / refresh / me) dùng chung `auth.service.toProfile`: PH luôn kèm `children` từ Student.parents (status active). Trước đó login/refresh thiếu children → PH thấy "chưa có bé".
- Token thêm `role.principal.soft/dark` (#EFEBFE/#5A3FD0) cho chip Hiệu trưởng theo phản hồi UI; Chip có tone `principal`.

## Nhật ký
<!-- YYYY-MM-DD | task | việc đã làm (≤15 từ) -->
- 2026-10-17 | 1.1 | Viết docs/schema.md: 17 models, trường, enum, ref, index
- 2026-10-17 | 1.1 | Sửa Payment: rawPayload, assignedBy/assignedAt; sửa quy tắc 3 CLAUDE.md
- 2026-10-17 | 1.2 | Viết docs/api.md: 20 module API, quyền, socket events, mã lỗi
- 2026-10-17 | 1.3 | Viết docs/structure.md: cây thư mục server/client, quy ước
- 2026-10-17 | 1.x | Áp dụng 8 chỉnh sửa schema/DESIGN đã duyệt, ghi Quyết định
- 2026-10-17 | 2.1 | package.json, env.js (Zod), db.js, app.js, index.js, .env.example, docker-compose
- 2026-10-17 | 2.2 | ApiError, sendSuccess, asyncHandler, paginate, errorHandler, rateLimiter, requestLogger, logger
- 2026-10-17 | 2.3 | User model, jwt utils, auth service/controller/routes, validator Zod; test 17 case đạt
- 2026-10-17 | 2.4 | authenticate, authorize, validate, checkOwnership (+ Class, Student, SchoolYear model)
- 2026-10-17 | 2.5 | swagger.js từ JSDoc @openapi, mount /api/docs ngoài production
- 2026-10-17 | 2.x | Docker Mongo rs0 chạy, 14 test đạt cả Mongo thật và in-memory; create-admin; rate-limit identifier; cookie env
- 2026-10-17 | 3.1 | User/SchoolYear/Class: validator, service, controller, routes; 14 test đạt
- 2026-10-18 | 3.2 | Student CRUD, my-children, avatar upload, Cloudinary/multer; /auth/me kèm children; 35 test đạt
- 2026-10-18 | 3.3 | Attendance: bulk upsert, list ngày/khoảng, lịch sử bé, stats; utils/date; fixtures test; 7 test đạt
- 2026-10-18 | 3.4 | DailyReport CRUD/bulk/seen, Album multipart + ảnh, /upload; sửa YAML Swagger; 8 test đạt
- 2026-10-18 | 3.5 | HealthRecord: create/bulk upsert/list chart/update/delete, BMI ở service; 4 test đạt
- 2026-10-18 | 3.6 | Menu + LessonPlan CRUD, approval.service, /menus/current; 6 test đạt
- 2026-10-18 | 3.7 | LeaveRequest (approve → Attendance excused) + MedicineNote (confirm/log/done/cancel); 6 test đạt
- 2026-10-18 | 3.8 | Tuition CRUD/bulk/my/summary, paymentCode, applyPayment, cron overdue; 8 test đạt
- 2026-10-18 | 3.9 | Notification (scope, isRead, notify hook) + Message (contacts, conversations, history, read) + emitter; 7 test đạt
- 2026-10-18 | 3.10 | AuditLog model/middleware/API + dashboard 4 role; toàn bộ 86 test đạt trên Mongo thật
- 2026-10-18 | 3.8 | Điều chỉnh đã duyệt: computeStatus, sửa Tuition có tiền (reason + audit), bulk skipped list; 86 test đạt
- 2026-10-18 | 4.1 | Model Payment (sepayId unique sparse, method, rawPayload, assignedBy/At)
- 2026-10-18 | 4.2 | sepay.service: Apikey auth, chống trùng, chuẩn hoá content, transaction, notify + payment:success
- 2026-10-18 | 4.3 | GET /payments/status/:code, GET /payments/qr/:tuitionId (qr.service)
- 2026-10-18 | 4.4 | list/unmatched/assign/unassign/manual/xoá tiền mặt, AuditLog; 10 test, tổng 96 đạt
- 2026-10-18 | 4.5 | E2E localhost bằng npm run sepay:test đạt; docs/sepay-test.md; ngrok chưa cài
- 2026-10-18 | 4.2 | Webhook: 5xx khi không lưu được Payment, unmatched khi lỗi sau lưu; 2 test mới, 12/12 đạt
- 2026-10-18 | 5.1 | client/: Vite 5, Tailwind 3 token DESIGN, Router v6, Zustand (auth/ui/toast), dayjs vi, constants nhãn VN
- 2026-10-18 | 5.2 | api/axios.js interceptor refresh có hàng đợi, errorMessage(); auth.api, notification.api
- 2026-10-18 | 5.3 | LoginPage (RHF+Zod), ProtectedRoute/GuestRoute, 403/404, ComingSoon placeholder
- 2026-10-18 | 5.4 | StaffLayout (Sidebar/Header/UserMenu/Bell), ParentLayout (ChildSwitcher/MobileNav), UI: Button/Input/Avatar/Chip/Skeleton/EmptyState/Toast; build OK
- 2026-10-18 | 6.1 | Admin: Tổng quan, Tài khoản (CRUD/khoá/reset MK), Năm học, Nhật ký; UI: Modal/ConfirmDialog/Select/Textarea/DataTable/StatTile/Tabs/SearchInput; hooks useFetch/usePagination
- 2026-10-18 | 6.1 | Sửa logic: self-lock/role, LAST_ADMIN, xoá năm học có dữ liệu, mustChangePassword + mật khẩu tạm 1 lần, chính sách MK production; 5 test mới
- 2026-10-18 | 6.4 | Trang Hôm nay PH: T7/CN hoặc chưa có dữ liệu → "Hôm nay bé nghỉ học" + liên kết ngày học gần nhất (Lịch nhận ?day=)
- 2026-10-18 | 6.x | Script kiểm tra luồng GV (47 bước) và HT (80 bước) như client gọi: tất cả đạt; upload tắt vì Cloudinary chưa cấu hình
- 2026-10-18 | 6.4 | Sửa PH không thấy con: login/refresh trả children; health API trả items; seed luôn có hôm nay; test parent-session
- 2026-10-18 | 7.3 | Seed demo reset được, in danh sách tài khoản; sửa index sepayId (tiền mặt trùng null) + test
- 2026-10-18 | 6.4 | GrowthChart: thay bảng xấp xỉ bằng LMS WHO gốc 0–60 tháng, ghi nguồn, nhận định z-score
- 2026-10-18 | 6.4 | PH: Hôm nay (timeline), Lịch, Học phí + Thanh toán QR + Biên lai, Tài khoản, Album, Thực đơn, Tăng trưởng, Xin nghỉ, Dặn thuốc, Chat
- 2026-10-18 | 6.3 | GV: Tổng quan, Lớp của tôi (hồ sơ bé + tăng trưởng), Điểm danh 1 chạm, Nhận xét chip, Album, Kế hoạch, Đo sức khoẻ, Đơn nghỉ, Dặn thuốc, Chat
- 2026-10-18 | 6.2 | HT: Tổng quan + biểu đồ 30 ngày, Lớp (+chi tiết), Học sinh, Giáo viên, Thực đơn, Kế hoạch, Học phí, Đối soát, Thông báo
- 2026-10-18 | 6.1 | Sửa UI theo phản hồi: bảng→thẻ mobile, ActionMenu, Tooltip/IconButton, chip HT tím, lọc 2 cột, autofill, drawer
