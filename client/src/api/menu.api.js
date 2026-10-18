import { api } from './axios.js';

export const menuApi = {
  list: (params) => api.get('/menus', { params }).then((r) => r.data),
  current: (params) => api.get('/menus/current', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/menus/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/menus', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/menus/${id}`, data).then((r) => r.data.data),
  submit: (id) => api.patch(`/menus/${id}/submit`).then((r) => r.data.data),
  approve: (id) => api.patch(`/menus/${id}/approve`).then((r) => r.data.data),
  reject: (id, reason) => api.patch(`/menus/${id}/reject`, { reason }).then((r) => r.data.data),
  remove: (id) => api.delete(`/menus/${id}`).then((r) => r.data),
};
