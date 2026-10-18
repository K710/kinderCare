import { api } from './axios.js';

export const dailyReportApi = {
  list: (params) => api.get('/daily-reports', { params }).then((r) => r.data.data), // { date, items:[{student, report}] }
  student: (studentId, params) => api.get(`/daily-reports/student/${studentId}`, { params }).then((r) => r.data.data),
  get: (id) => api.get(`/daily-reports/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/daily-reports', data).then((r) => r.data.data),
  bulk: (data) => api.post('/daily-reports/bulk', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/daily-reports/${id}`, data).then((r) => r.data.data),
  markSeen: (id) => api.patch(`/daily-reports/${id}/seen`).then((r) => r.data.data),
  remove: (id) => api.delete(`/daily-reports/${id}`).then((r) => r.data),
};
