# Cấu trúc thư mục – KinderCare

```
Project/
├── CLAUDE.md
├── PROGRESS.md
├── DESIGN.md
├── docs/                 # schema.md, api.md, structure.md
├── server/
└── client/
```

---

## Server (`/server`)
```
server/
├── package.json
├── .env.example
├── src/
│   ├── index.js                 # entry: tạo http server, gắn Socket.IO, listen
│   ├── app.js                   # Express app: helmet, cors, json, rate-limit, routes, errorHandler
│   ├── config/
│   │   ├── env.js               # đọc + validate biến môi trường
│   │   ├── db.js                # kết nối Mongoose
│   │   ├── cloudinary.js
│   │   ├── swagger.js
│   │   └── constants.js         # ROLES, enums dùng chung (status, ageGroup…)
│   ├── models/                  # 17 file, mỗi model 1 file: User.js, Student.js, …
│   │   └── index.js             # export tất cả
│   ├── routes/
│   │   ├── index.js             # mount /api/v1/*
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── schoolYear.routes.js
│   │   ├── class.routes.js
│   │   ├── student.routes.js
│   │   ├── attendance.routes.js
│   │   ├── dailyReport.routes.js
│   │   ├── healthRecord.routes.js
│   │   ├── menu.routes.js
│   │   ├── lessonPlan.routes.js
│   │   ├── leaveRequest.routes.js
│   │   ├── medicineNote.routes.js
│   │   ├── tuition.routes.js
│   │   ├── payment.routes.js    # gồm /sepay-webhook (không JWT)
│   │   ├── notification.routes.js
│   │   ├── message.routes.js
│   │   ├── album.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── auditLog.routes.js
│   │   └── upload.routes.js
│   ├── controllers/             # 1 file / module, cùng tên routes: *.controller.js
│   │                            # chỉ parse req → gọi service → sendResponse
│   ├── services/                # logic nghiệp vụ, truy vấn model: *.service.js
│   │   ├── sepay.service.js     # xử lý webhook, khớp mã, transaction
│   │   ├── qr.service.js        # sinh URL VietQR
│   │   ├── notification.service.js  # tạo Notification + emit socket
│   │   └── …
│   ├── middlewares/
│   │   ├── authenticate.js      # verify access token → req.user
│   │   ├── authorize.js         # authorize('admin','principal')
│   │   ├── checkOwnership.js    # T: lớp mình; PH: con mình (theo param/body)
│   │   ├── validate.js          # validate(schemaZod) cho body/query/params
│   │   ├── upload.js            # multer memory storage + giới hạn dung lượng
│   │   ├── rateLimiter.js       # global + webhook riêng
│   │   ├── auditLog.js          # ghi AuditLog cho route cần theo dõi
│   │   └── errorHandler.js      # notFound + errorHandler
│   ├── validators/              # Zod schema theo module: *.validator.js
│   ├── sockets/
│   │   ├── index.js             # init io, auth middleware, join rooms
│   │   └── handlers/            # message.handler.js, …
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── response.js          # sendSuccess(res, data, message, pagination)
│   │   ├── asyncHandler.js
│   │   ├── logger.js            # winston/pino
│   │   ├── paginate.js          # parse page/limit/sort → skip
│   │   ├── date.js              # startOfDayUTC, weekStart…
│   │   ├── generateCode.js      # paymentCode HPXXXXXXXX
│   │   └── jwt.js
│   ├── jobs/
│   │   └── tuitionOverdue.job.js  # cron chuyển overdue
│   └── seeds/
│       └── seed.js              # 4 tài khoản demo + dữ liệu mẫu
└── uploads/                     # tạm (nếu dùng disk), .gitignore
```

Luồng request: `routes → validate → authenticate → authorize → checkOwnership → controller → service → model`.

---

## Client (`/client`)
```
client/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
├── .env.example                 # VITE_API_URL, VITE_SOCKET_URL
└── src/
    ├── main.jsx
    ├── App.jsx                  # RouterProvider
    ├── router/
    │   ├── index.jsx            # định nghĩa routes theo role
    │   ├── ProtectedRoute.jsx   # kiểm tra đăng nhập + roles
    │   └── paths.js             # hằng số đường dẫn
    ├── api/
    │   ├── axios.js             # instance + interceptor refresh token
    │   ├── auth.api.js
    │   ├── user.api.js
    │   ├── class.api.js
    │   ├── student.api.js
    │   ├── attendance.api.js
    │   ├── dailyReport.api.js
    │   ├── healthRecord.api.js
    │   ├── menu.api.js
    │   ├── lessonPlan.api.js
    │   ├── leaveRequest.api.js
    │   ├── medicineNote.api.js
    │   ├── tuition.api.js
    │   ├── payment.api.js
    │   ├── notification.api.js
    │   ├── message.api.js
    │   ├── album.api.js
    │   └── dashboard.api.js
    ├── stores/                  # Zustand
    │   ├── auth.store.js        # user, accessToken, login/logout
    │   ├── notification.store.js
    │   ├── chat.store.js
    │   └── ui.store.js          # sidebar, theme, selectedChild (PH)
    ├── socket/
    │   └── index.js             # kết nối, lắng nghe event → cập nhật store
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useSocket.js
    │   ├── usePagination.js
    │   └── usePaymentStatus.js  # polling 5s / 15 phút
    ├── components/
    │   ├── ui/                  # theo DESIGN.md: Button, Input, Select, Modal, Table, Badge, Card, Tabs, Toast, Skeleton, EmptyState
    │   ├── layout/              # AppLayout, Sidebar, Header, MobileNav, PageHeader
    │   ├── form/                # FormField (RHF + Zod), DatePicker, ImageUpload
    │   └── shared/              # Avatar, StatusBadge, ConfirmDialog, Pagination, DataTable
    ├── features/                # theo module, mỗi feature có components riêng
    │   ├── auth/                # LoginPage
    │   ├── admin/               # UsersPage, SchoolYearsPage, AuditLogsPage
    │   ├── principal/           # DashboardPage, ClassesPage, TuitionsPage, ReconcilePage, MenusPage, ApprovalsPage, NotificationsPage
    │   ├── teacher/             # DashboardPage, MyClassPage, AttendancePage, DailyReportPage, AlbumsPage, LessonPlansPage, HealthPage, LeaveRequestsPage, MedicineNotesPage
    │   ├── parent/              # HomePage, ChildPage, AttendancePage, ReportsPage, AlbumsPage, MenuPage, GrowthChartPage, LeaveRequestPage, MedicinePage, TuitionPage, PaymentQRPage
    │   ├── chat/                # ConversationsPage, ChatWindow (T + PH dùng chung)
    │   └── notifications/       # NotificationList, NotificationBell
    ├── pages/
    │   ├── Forbidden403.jsx
    │   └── NotFound404.jsx
    ├── utils/
    │   ├── format.js            # tiền VND, ngày, tuổi
    │   ├── constants.js         # enums + label tiếng Việt
    │   └── validators.js        # Zod schema dùng chung
    └── styles/
        └── index.css            # Tailwind base + token từ DESIGN.md
```

Quy ước client:
- Route theo role: `/admin/*`, `/principal/*`, `/teacher/*`, `/parent/*`; sau login redirect theo role.
- Parent mobile-first: bottom MobileNav, chọn con bằng dropdown ở Header (`ui.store.selectedChild`).
- Mọi call API qua `api/*.api.js`, không gọi axios trực tiếp trong component.
