import { api } from './axios.js';

export const lessonPlanApi = {
  list: (params) => api.get('/lesson-plans', { params }).then((r) => r.data),
  get: (id) => api.get(`/lesson-plans/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/lesson-plans', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/lesson-plans/${id}`, data).then((r) => r.data.data),
  submit: (id) => api.patch(`/lesson-plans/${id}/submit`).then((r) => r.data.data),
  approve: (id) => api.patch(`/lesson-plans/${id}/approve`).then((r) => r.data.data),
  reject: (id, reason) => api.patch(`/lesson-plans/${id}/reject`, { reason }).then((r) => r.data.data),
  remove: (id) => api.delete(`/lesson-plans/${id}`).then((r) => r.data),
};
