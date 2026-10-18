import { api } from './axios.js';

export const medicineNoteApi = {
  list: (params) => api.get('/medicine-notes', { params }).then((r) => r.data),
  my: (params) => api.get('/medicine-notes/my', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/medicine-notes/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/medicine-notes', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/medicine-notes/${id}`, data).then((r) => r.data.data),
  confirm: (id) => api.patch(`/medicine-notes/${id}/confirm`).then((r) => r.data.data),
  addLog: (id, data) => api.post(`/medicine-notes/${id}/logs`, data).then((r) => r.data.data),
  done: (id) => api.patch(`/medicine-notes/${id}/done`).then((r) => r.data.data),
  cancel: (id) => api.patch(`/medicine-notes/${id}/cancel`).then((r) => r.data.data),
};
