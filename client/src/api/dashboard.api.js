import { api } from './axios.js';

export const dashboardApi = {
  admin: () => api.get('/dashboard/admin').then((r) => r.data.data),
  principal: () => api.get('/dashboard/principal').then((r) => r.data.data),
  teacher: () => api.get('/dashboard/teacher').then((r) => r.data.data),
  parent: () => api.get('/dashboard/parent').then((r) => r.data.data),
};
