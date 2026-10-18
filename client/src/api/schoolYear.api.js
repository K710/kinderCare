import { api } from './axios.js';

export const schoolYearApi = {
  list: () => api.get('/school-years').then((r) => r.data.data),
  current: () => api.get('/school-years/current').then((r) => r.data.data),
  create: (data) => api.post('/school-years', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/school-years/${id}`, data).then((r) => r.data.data),
  setCurrent: (id) => api.patch(`/school-years/${id}/set-current`).then((r) => r.data.data),
  remove: (id) => api.delete(`/school-years/${id}`).then((r) => r.data),
};
