import cron from 'node-cron';
import { markOverdue } from '../services/tuition.service.js';
import { logger } from '../utils/logger.js';
import { TIMEZONE } from '../config/constants.js';

// 00:05 giờ VN mỗi ngày: chuyển học phí quá hạn sang overdue
export function startTuitionOverdueJob() {
  const task = cron.schedule(
    '5 0 * * *',
    async () => {
      try {
        const n = await markOverdue();
        if (n) logger.info(`Cron học phí: ${n} bản ghi chuyển sang quá hạn`);
      } catch (err) {
        logger.error('Cron học phí lỗi', { err: err.message });
      }
    },
    { timezone: TIMEZONE },
  );
  logger.info('Đã lên lịch cron học phí quá hạn (00:05 Asia/Ho_Chi_Minh)');
  return task;
}
