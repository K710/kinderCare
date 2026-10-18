import { api } from './axios.js';

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data.data.count),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data.data),
};
