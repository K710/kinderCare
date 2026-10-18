import { api } from './axios.js';

export const healthRecordApi = {
  student: (studentId) => api.get(`/health-records/student/${studentId}`).then((r) => r.data.data),
  create: (data) => api.post('/health-records', data).then((r) => r.data.data),
  bulk: (data) => api.post('/health-records/bulk', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/health-records/${id}`, data).then((r) => r.data.data),
  remove: (id) => api.delete(`/health-records/${id}`).then((r) => r.data),
};
