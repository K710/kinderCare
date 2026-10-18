import http from 'http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import app from './app.js';
import { startTuitionOverdueJob } from './jobs/tuitionOverdue.job.js';

const server = http.createServer(app);

async function start() {
  try {
    await connectDB();
    // Socket.IO sẽ gắn vào `server` ở GĐ7.1
    startTuitionOverdueJob();
    server.listen(env.PORT, () => {
      logger.info(`Server chạy tại http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
    });
  } catch (err) {
    logger.error('Không khởi động được server', { err: err.message });
    process.exit(1);
  }
}

// Tắt êm: đóng HTTP rồi đóng Mongo
async function shutdown(signal) {
  logger.info(`Nhận ${signal}, đang tắt server...`);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason: reason?.message || reason });
});

start();

export { server };
