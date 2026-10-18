import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './config/zod.js';
import { env, isProd } from './config/env.js';
import { mountSwagger } from './config/swagger.js';
import routes from './routes/index.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Chạy sau proxy (ngrok, nginx) để lấy đúng IP cho rate-limit
app.set('trust proxy', 1);

// Swagger UI cần nới CSP, chỉ bật tài liệu ở môi trường không phải production
app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false }));
app.use(
  cors({
    origin: env.CLIENT_URL.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(globalLimiter);

if (!isProd) mountSwagger(app);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
