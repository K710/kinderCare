import { api } from './axios.js';

export const studentApi = {
  list: (params) => api.get('/students', { params }).then((r) => r.data),
  myChildren: () => api.get('/students/my-children').then((r) => r.data.data),
  get: (id) => api.get(`/students/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/students', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/students/${id}`, data).then((r) => r.data.data),
  setParents: (id, parents) => api.patch(`/students/${id}/parents`, { parents }).then((r) => r.data.data),
  setStatus: (id, status) => api.patch(`/students/${id}/status`, { status }).then((r) => r.data.data),
  updateAvatar: (id, file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.patch(`/students/${id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
  },
};
