# Kiểm thử webhook SePay

## 1. Cấu hình `.env`
```
SEPAY_WEBHOOK_KEY=chuoi_bi_mat_tu_dat      # trùng với API Key khai báo trên SePay
SEPAY_ACCOUNT=0123456789                    # số TK nhận tiền
SEPAY_BANK=MBBank                           # mã ngân hàng theo SePay (MBBank, Vietcombank, ACB…)
SEPAY_ACCOUNT_NAME=TRUONG MAM NON KINDERCARE
```

## 2. Test cục bộ (không cần SePay)
```bash
cd server && npm run dev
# tạo học phí → lấy paymentCode (vd HPA1B2C3D4), rồi:
npm run sepay:test -- --code HPA1B2C3D4 --amount 2500000
npm run sepay:test -- --content "khong co ma"          # → Payment unmatched
npm run sepay:test -- --code HPA1B2C3D4 --type out     # → bỏ qua (tiền ra)
```
Kiểm tra: `GET /api/v1/payments/status/HPA1B2C3D4` (token PH) và `GET /api/v1/payments/unmatched` (token HT).

## 3. Test với SePay thật qua ngrok
1. Cài ngrok (https://ngrok.com/download), đăng nhập `ngrok config add-authtoken <token>`.
2. Chạy server (`npm run dev`, cổng 5000) rồi `ngrok http 5000` → lấy URL `https://xxxx.ngrok-free.app`.
3. Trên https://my.sepay.vn → Webhooks → Thêm webhook:
   - URL: `https://xxxx.ngrok-free.app/api/v1/payments/sepay-webhook`
   - Kiểu xác thực: **API Key**, giá trị = `SEPAY_WEBHOOK_KEY`
   - Sự kiện: *Có tiền vào*
4. Bấm **Gửi thử** trên trang chi tiết webhook → server phải trả `200 {"success":true}` trong 30 giây.
5. Xem log: trang *Nhật ký webhooks* của SePay và `GET /api/v1/audit-logs?action=SEPAY_WEBHOOK` (token admin).
6. Chuyển khoản thật số tiền nhỏ với nội dung đúng mã HP → PH nhận socket `payment:success` + thông báo; Tuition đổi trạng thái.

## 4. Lưu ý format SePay (đã đối chiếu docs.sepay.vn 2026-10-18)
- Header: `Authorization: Apikey <key>`.
- Body: `id, gateway, transactionDate ("YYYY-MM-DD HH:mm:ss" giờ VN), accountNumber, subAccount, code, content, transferType (in|out), description, transferAmount, accumulated, referenceCode`.
- Thành công khi: HTTP 200/201 **và** body có `"success": true` **và** xử lý ≤ 30 giây. Thất bại → SePay retry tối đa 7 lần trong 5 giờ (Fibonacci) → server chống trùng theo `id`.
- Server chuẩn hoá `content` (viết hoa, bỏ khoảng trắng và `-`/`_`) rồi tìm `HP[A-Z0-9]{8}`; 0 hoặc ≥2 mã → `unmatched`. Trống content → dùng field `code` của SePay.
