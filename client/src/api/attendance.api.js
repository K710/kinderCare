import { api } from './axios.js';

export const attendanceApi = {
  list: (params) => api.get('/attendance', { params }).then((r) => r.data.data),
  student: (studentId, params) => api.get(`/attendance/student/${studentId}`, { params }).then((r) => r.data.data),
  bulk: (data) => api.post('/attendance/bulk', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/attendance/${id}`, data).then((r) => r.data.data),
  stats: (params) => api.get('/attendance/stats', { params }).then((r) => r.data.data),
};
