import { api } from './axios.js';

export const auditLogApi = {
  list: (params) => api.get('/audit-logs', { params }).then((r) => r.data),
  get: (id) => api.get(`/audit-logs/${id}`).then((r) => r.data.data),
  actions: () => api.get('/audit-logs/actions').then((r) => r.data.data),
};
