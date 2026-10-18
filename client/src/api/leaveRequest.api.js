import { api } from './axios.js';

export const leaveRequestApi = {
  list: (params) => api.get('/leave-requests', { params }).then((r) => r.data),
  my: (params) => api.get('/leave-requests/my', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/leave-requests/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/leave-requests', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/leave-requests/${id}`, data).then((r) => r.data.data),
  remove: (id) => api.delete(`/leave-requests/${id}`).then((r) => r.data),
  approve: (id, note) => api.patch(`/leave-requests/${id}/approve`, note ? { note } : {}).then((r) => r.data.data),
  reject: (id, note) => api.patch(`/leave-requests/${id}/reject`, { note }).then((r) => r.data.data),
};
