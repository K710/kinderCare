import { Router } from 'express';
import { sendSuccess } from '../utils/response.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import schoolYearRoutes from './schoolYear.routes.js';
import classRoutes from './class.routes.js';
import studentRoutes from './student.routes.js';
import attendanceRoutes from './attendance.routes.js';
import dailyReportRoutes from './dailyReport.routes.js';
import albumRoutes from './album.routes.js';
import uploadRoutes from './upload.routes.js';
import healthRecordRoutes from './healthRecord.routes.js';
import menuRoutes from './menu.routes.js';
import lessonPlanRoutes from './lessonPlan.routes.js';
import leaveRequestRoutes from './leaveRequest.routes.js';
import medicineNoteRoutes from './medicineNote.routes.js';
import tuitionRoutes from './tuition.routes.js';
import notificationRoutes from './notification.routes.js';
import messageRoutes from './message.routes.js';
import auditLogRoutes from './auditLog.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import paymentRoutes from './payment.routes.js';
import fileRoutes from './file.routes.js';

const router = Router();

// Kiểm tra server sống
router.get('/health', (req, res) => sendSuccess(res, { status: 'ok', time: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/school-years', schoolYearRoutes);
router.use('/classes', classRoutes);
router.use('/students', studentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/daily-reports', dailyReportRoutes);
router.use('/albums', albumRoutes);
router.use('/upload', uploadRoutes);
router.use('/health-records', healthRecordRoutes);
router.use('/menus', menuRoutes);
router.use('/lesson-plans', lessonPlanRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/medicine-notes', medicineNoteRoutes);
router.use('/tuitions', tuitionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/payments', paymentRoutes);
router.use('/files', fileRoutes); // link ảnh có chữ ký, không cần JWT

export default router;
