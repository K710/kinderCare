# KinderCare – Hệ thống quản lý mầm non

## Quy tắc làm việc (BẮT BUỘC)
1. Đầu phiên: đọc `PROGRESS.md` → làm task `[ ]` đầu tiên của giai đoạn hiện tại. KHÔNG quét toàn bộ codebase, chỉ mở file liên quan task.
2. Xong mỗi task: tick `[x]` trong PROGRESS.md + thêm 1 dòng vào "Nhật ký" (≤15 từ). Quyết định kỹ thuật mới → ghi vào "Quyết định".
3. Làm liên tục các task trong cùng giai đoạn. Chỉ dừng khi hết giai đoạn, tóm tắt ≤5 dòng, chờ xác nhận.
4. Không giải thích dài, không lặp lại code đã có. Chỉ in phần code thay đổi.
5. Comment tiếng Việt ở chỗ quan trọng. UI tiếng Việt.
6. Task giao diện (GĐ5–6): đọc `DESIGN.md` trước, dùng đúng token/component đã định. Task backend không cần đọc.
7. Quyết định làm khác CLAUDE.md, hoặc liên quan thanh toán, bảo mật, phân quyền: dừng hỏi trước khi làm. Quyết định khác: tự làm, ghi vào Quyết định, và liệt kê tên các quyết định mới trong tóm tắt cuối giai đoạn.
8. Xong mỗi task (sau khi tick PROGRESS.md): dừng lại commit ngay, mỗi task một commit, message tiếng Việt dạng `GĐx.y: việc đã làm`, rồi mới sang task tiếp theo. Không push nếu chưa được yêu cầu.

## Stack
- Client `/client`: React (Vite), React Router v6, Zustand, Axios, TailwindCSS, React Hook Form + Zod, Socket.IO client
- Server `/server`: Node + Express (routes/controllers/services/models/middlewares), Mongoose, JWT (access+refresh), bcrypt, Socket.IO, Multer + Cloudinary, helmet, cors, rate-limit, Swagger
- API prefix: `/api/v1`. Response chuẩn: `{ success, data, message, pagination? }`

## Vai trò (RBAC) – `admin | principal | teacher | parent`
- admin: tài khoản, phân quyền, cấu hình trường/năm học, audit log
- principal: dashboard thống kê, lớp, giáo viên, duyệt thực đơn/kế hoạch, học phí, thông báo toàn trường, báo cáo Excel/PDF
- teacher: lớp mình, điểm danh, nhận xét ngày, album, kế hoạch giảng dạy, chiều cao/cân nặng, duyệt đơn nghỉ, chat PH
- parent: thông tin con (nhiều con), điểm danh, nhận xét, ảnh, thực đơn, biểu đồ tăng trưởng, đơn nghỉ, dặn thuốc, học phí + thanh toán SePay, chat GV
- Quyền cấp dữ liệu: parent chỉ xem con mình; teacher chỉ lớp mình phụ trách (middleware `checkOwnership`).

## Models
User, Student, Class, SchoolYear, Attendance, DailyReport, HealthRecord, Menu, LessonPlan, LeaveRequest, MedicineNote, Tuition, Payment, Notification, Message, Album, AuditLog

## Thanh toán SePay (chuyển khoản ngân hàng + VietQR)
Luồng:
1. Principal tạo `Tuition` (studentId, month, amount, dueDate, status: `unpaid|partial|paid|overdue`).
2. Mỗi Tuition có `paymentCode` duy nhất, dạng `HP` + 8 ký tự in hoa (vd `HPA1B2C3D4`), không dấu cách.
3. Parent bấm "Thanh toán" → client hiện QR: `https://qr.sepay.vn/img?acc={SEPAY_ACCOUNT}&bank={SEPAY_BANK}&amount={amount}&des={paymentCode}` + thông tin chuyển khoản thủ công.
4. SePay gọi webhook `POST /api/v1/payments/sepay-webhook`:
   - Xác thực header `Authorization: Apikey {SEPAY_WEBHOOK_KEY}` → sai thì 401.
   - Body dùng: `id, gateway, transactionDate, accountNumber, content, transferType, transferAmount, referenceCode`.
   - Bỏ qua nếu `transferType !== "in"`.
   - Chống trùng: `Payment.sepayId` unique; đã có → trả 200 luôn.
   - Regex tìm `HP[A-Z0-9]{8}` trong `content` → tìm Tuition. Không thấy → lưu Payment `status: unmatched` để principal đối soát tay.
   - Cộng tiền: đủ → `paid`, thiếu → `partial`, thừa → `paid` + ghi chú.
   - Dùng MongoDB transaction khi cập nhật Payment + Tuition.
   - Emit Socket.IO `payment:success` tới phòng của parent; tạo Notification.
   - Luôn trả `200 { success: true }` khi xử lý xong.
5. Client polling `GET /payments/status/:paymentCode` mỗi 5s (dự phòng khi socket rớt), tối đa 15 phút.
6. Principal: trang đối soát giao dịch `unmatched`, gán tay vào Tuition; xuất báo cáo thu.
- Route webhook KHÔNG qua JWT, có rate-limit riêng, log toàn bộ body vào AuditLog.
- Env: `SEPAY_WEBHOOK_KEY, SEPAY_ACCOUNT, SEPAY_BANK, SEPAY_ACCOUNT_NAME`
- Dev: test webhook bằng ngrok + nút "Gửi webhook test" trên SePay. Kiểm tra lại format tại docs.sepay.vn trước khi code.

## Lệnh
- Server: `cd server && npm run dev` | seed: `npm run seed`
- Client: `cd client && npm run dev`
