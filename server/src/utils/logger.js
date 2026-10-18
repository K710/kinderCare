import winston from 'winston';
import { env, isProd } from '../config/env.js';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Dev: màu + dòng ngắn. Prod: JSON để đẩy vào hệ thống log.
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${stack || message}${extra}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProd ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

// Stream cho morgan-style request log (dùng ở middleware requestLogger)
export const loggerStream = {
  write: (msg) => logger.http ? logger.http(msg.trim()) : logger.info(msg.trim()),
};
