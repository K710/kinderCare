import { api } from './axios.js';

export const paymentApi = {
  list: (params) => api.get('/payments', { params }).then((r) => r.data),
  unmatched: (params) => api.get('/payments/unmatched', { params }).then((r) => r.data),
  get: (id) => api.get(`/payments/${id}`).then((r) => r.data.data),
  status: (paymentCode) => api.get(`/payments/status/${paymentCode}`).then((r) => r.data.data),
  qr: (tuitionId) => api.get(`/payments/qr/${tuitionId}`).then((r) => r.data.data),
  assign: (id, tuitionId, note) => api.patch(`/payments/${id}/assign`, { tuitionId, note }).then((r) => r.data.data),
  unassign: (id, reason) => api.patch(`/payments/${id}/unassign`, { reason }).then((r) => r.data.data),
  manual: (data) => api.post('/payments/manual', data).then((r) => r.data.data),
  removeCash: (id, reason) => api.delete(`/payments/${id}`, { data: { reason } }).then((r) => r.data),
};
