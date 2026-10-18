import { api } from './axios.js';

export const userApi = {
  list: (params) => api.get('/users', { params }).then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/users', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/users/${id}`, data).then((r) => r.data.data),
  setStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }).then((r) => r.data.data),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, newPassword ? { newPassword } : {}).then((r) => r.data),
  teachers: (params) => api.get('/users/teachers', { params }).then((r) => r.data),
  parents: (params) => api.get('/users/parents', { params }).then((r) => r.data),
};
