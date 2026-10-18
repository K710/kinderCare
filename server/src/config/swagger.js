import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from './env.js';

// Đọc JSDoc @openapi trong routes/*.js → tài liệu tại /api/docs
const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'KinderCare API',
      version: '1.0.0',
      description: 'API hệ thống quản lý mầm non. Response chuẩn `{ success, data, message, pagination? }`.',
    },
    servers: [{ url: `http://localhost:${env.PORT}/api/v1`, description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { nullable: true },
            message: { type: 'string' },
            pagination: {
              type: 'object',
              nullable: true,
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            data: { nullable: true, example: null },
            message: { type: 'string' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            errors: {
              type: 'array',
              items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth' }, { name: 'Users' }, { name: 'SchoolYears' }, { name: 'Classes' }, { name: 'Students' },
      { name: 'Attendance' }, { name: 'DailyReports' }, { name: 'HealthRecords' }, { name: 'Menus' },
      { name: 'LessonPlans' }, { name: 'LeaveRequests' }, { name: 'MedicineNotes' }, { name: 'Tuitions' },
      { name: 'Payments' }, { name: 'Notifications' }, { name: 'Messages' }, { name: 'Albums' },
      { name: 'Dashboard' }, { name: 'AuditLogs' }, { name: 'Upload' },
    ],
  },
  apis: ['./src/routes/*.js'],
});

export function mountSwagger(app) {
  app.get('/api/docs.json', (req, res) => res.json(spec));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'KinderCare API Docs',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
}
