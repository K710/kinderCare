# DESIGN – KinderCare
Chỉ đọc file này khi làm task giao diện (GĐ5–6). Không tự ý đổi token; cần đổi → ghi vào "Quyết định" trong PROGRESS.md.

## Ý tưởng chủ đạo: "Sổ liên lạc"
App là phiên bản số của cuốn sổ liên lạc mầm non: ấm áp, rõ ràng, dễ đọc với phụ huynh bận rộn. Vui tươi ở điểm nhấn, gọn gàng ở dữ liệu.
- Phụ huynh: mobile-first, cảm giác như lật sổ của con mỗi ngày.
- Giáo viên: thao tác nhanh trên tablet/điện thoại (điểm danh 1 chạm).
- Hiệu trưởng/Admin: desktop, dày dữ liệu, bảng và biểu đồ.
- Điểm nhấn duy nhất: **Dòng thời gian một ngày của bé** (trang chủ phụ huynh). Mọi thứ khác giữ yên tĩnh.

## Màu (Tailwind `theme.extend.colors`)
| Token | Hex | Dùng cho |
|---|---|---|
| ink | #1F2A44 | chữ chính, icon |
| ink-soft | #5B6478 | chữ phụ |
| paper | #F6F8FB | nền trang |
| surface | #FFFFFF | khối nội dung |
| line | #E3E7EE | viền, divider |
| leaf | #2F9E5B | màu thương hiệu, nút chính |
| sun | #FFC23D | điểm nhấn, badge mới |
| sky | #4BA3E3 | link, thông tin |
| peach | #FF7F6E | cảnh báo, vắng không phép |
| berry | #D6455D | lỗi, xóa |

Màu vai trò (chỉ dùng ở thanh bên + avatar viền, không tô cả trang): admin `#5B6478`, principal `#7A5AF8`, teacher `leaf`, parent `#F28C28`.

Trạng thái (luôn kèm icon + chữ, không chỉ màu):
- Có mặt: leaf · Đi muộn: sky · Vắng có phép: sun · Vắng không phép: peach · Chưa điểm danh: ink-soft
- Học phí: paid leaf · partial sun · unpaid ink-soft · overdue berry · unmatched sky

Dark mode: không làm ở bản đầu.

## Chữ (Google Fonts, đều hỗ trợ tiếng Việt)
- Tiêu đề: **Baloo 2** (600/700) – tròn, thân thiện. Chỉ dùng cho h1–h3, tên bé, số liệu lớn.
- Nội dung: **Be Vietnam Pro** (400/500/600). Số trong bảng: `tabular-nums`.
- Fallback: `system-ui, sans-serif`.
- Thang chữ (px): 12 / 14 / 16 (body) / 18 / 22 / 28 / 36. Line-height body 1.6, tiêu đề 1.25.
- Viết thường kiểu câu ("Điểm danh hôm nay"), không VIẾT HOA toàn bộ nhãn.

## Hình khối & khoảng cách
- Lưới 4px. Khoảng cách chuẩn: 8 / 12 / 16 / 24 / 32.
- Bo góc theo cấp bậc: nút & input 10px, khối nội dung 16px, ảnh album 12px, chip trạng thái full.
- Bóng: chỉ cho lớp nổi (modal, dropdown, bottom sheet). Khối thường dùng viền `line`, không bóng.
- Không gradient trang trí. Họa tiết duy nhất cho phép: icon nét vẽ tay nhỏ ở empty state.
- Icon: lucide-react, nét 1.75, cỡ 20 (24 trên mobile nav).

## Bố cục
### Nhân sự (admin/principal/teacher) – desktop
```
┌────────┬──────────────────────────────────┐
│ Logo   │ Tiêu đề trang      [🔔] [Avatar] │
│────────│──────────────────────────────────│
│ Menu   │ Bộ lọc / hành động chính         │
│ theo   │──────────────────────────────────│
│ vai trò│ Nội dung (max-w 1280, căn trái)  │
│ 240px  │                                  │
└────────┴──────────────────────────────────┘
```
Sidebar thu gọn còn icon ở < 1024px; < 768px chuyển thành drawer.

### Phụ huynh – mobile
```
┌──────────────────────────┐
│ [Ảnh bé] Tên bé ▾  🔔    │  ← đổi con nếu nhiều con
│ Lá 2 · Thứ Hai 19/10     │
├──────────────────────────┤
│ ● 7:30 Đến lớp    ✓      │
│ │ 8:00 Ăn sáng    Ăn hết │  ← Dòng thời gian
│ │ 9:00 Hoạt động  [ảnh]  │
│ │ 11:00 Ăn trưa   Ăn ít  │
│ │ 12:00 Ngủ trưa  2 giờ  │
│ ○ 16:30 Về              │
├──────────────────────────┤
│ Lời nhắn của cô (thẻ)    │
│ Thực đơn hôm nay         │
├──────────────────────────┤
│ 🏠  📅  💬  💳  👤       │  ← tab dưới: Hôm nay, Lịch, Tin nhắn, Học phí, Tài khoản
└──────────────────────────┘
```
Desktop cho phụ huynh: cùng nội dung, cột giữa max-w 640px.

## Component chuẩn (tạo trong `client/src/components/ui`)
Button (primary leaf, secondary viền, ghost, danger berry; cao 44px mobile/40px desktop), Input, Select, DatePicker, Textarea, Chip trạng thái, Avatar (viền màu vai trò), Table (header dính, hàng zebra nhẹ, phân trang), Modal, BottomSheet (mobile), Toast, EmptyState, Skeleton, StatTile, Tabs, Timeline, PhotoGrid, ChatBubble.

## Màn hình đặc thù
- **Điểm danh (GV)**: lưới thẻ học sinh (ảnh + tên), chạm 1 lần = có mặt, giữ/nhấn menu = vắng có phép/không phép. Thanh dưới cố định: "Đã điểm danh 18/22 · Lưu điểm danh".
- **Nhận xét ngày (GV)**: chọn nhanh bằng chip (Ăn hết / Ăn ít / Không ăn), áp dụng cho cả lớp rồi sửa từng bé.
- **Biểu đồ tăng trưởng**: đường cân nặng/chiều cao của bé + vùng chuẩn WHO màu nhạt.
- **Thanh toán SePay (PH)**: số tiền lớn (Baloo 2, 36px) → QR to giữa màn hình → bảng thông tin chuyển khoản, mỗi dòng có nút "Sao chép" (nội dung CK nổi bật màu sun). Dưới cùng: "Đang chờ xác nhận…" + đếm ngược 15 phút. Thành công → màn hình xác nhận với dấu tick leaf, nút "Xem biên lai".
- **Đối soát (HT)**: bảng giao dịch unmatched, nút "Gán vào học phí" mở modal tìm học sinh.
- **Dashboard HT**: hàng StatTile (sĩ số, đi học hôm nay %, đã thu tháng này, đơn chờ duyệt) + biểu đồ chuyên cần 30 ngày + danh sách việc cần duyệt.

## Chữ trong giao diện
- Nút nói đúng việc sẽ xảy ra: "Lưu điểm danh", "Gửi đơn nghỉ", "Duyệt". Toast dùng cùng từ: "Đã lưu điểm danh".
- Lỗi nói rõ chuyện gì và cách sửa: "Số điện thoại chưa đúng, cần 10 chữ số." Không xin lỗi chung chung.
- Empty state mời hành động: "Chưa có ảnh nào hôm nay. Đăng ảnh hoạt động đầu tiên."
- Gọi đúng vai: "cô/thầy", "ba mẹ", "bé". Ngày giờ: `Thứ Hai, 19/10/2026`, `07:30`. Tiền: `1.500.000 ₫`.

## Chất lượng tối thiểu
Tương phản AA, focus ring 2px sky, vùng chạm ≥ 44px, ảnh có alt, tôn trọng `prefers-reduced-motion`, skeleton khi tải. Chuyển động chỉ khi người dùng thao tác (mở sheet, tick điểm danh), ≤ 200ms.

## Tránh
Thẻ giống hệt nhau xếp lưới khắp nơi, gradient, bóng mờ dưới mọi khối, chữ VIẾT HOA làm nhãn, màu kẹo pastel phủ toàn trang, emoji thay icon trong UI thật, mũi tên "→" gắn vào mọi nút.
