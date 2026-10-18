import { api } from './axios.js';

export const tuitionApi = {
  list: (params) => api.get('/tuitions', { params }).then((r) => r.data),
  my: (params) => api.get('/tuitions/my', { params }).then((r) => r.data.data),
  summary: (params) => api.get('/tuitions/summary', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/tuitions/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/tuitions', data).then((r) => r.data.data),
  bulkCreate: (data) => api.post('/tuitions/bulk', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/tuitions/${id}`, data).then((r) => r.data.data),
  remove: (id) => api.delete(`/tuitions/${id}`).then((r) => r.data),
};
