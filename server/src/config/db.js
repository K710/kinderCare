import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB đã kết nối'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB lỗi', { err: err.message }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB mất kết nối'));

  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
