import { z } from 'zod';

// Thông báo lỗi Zod mặc định bằng tiếng Việt (import 1 lần ở app.js, trước mọi validator)
z.config(z.locales.vi());
