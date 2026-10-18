import { api } from './axios.js';

export const messageApi = {
  contacts: () => api.get('/messages/contacts').then((r) => r.data.data), // [{ user, students:[] }]
  conversations: () => api.get('/messages/conversations').then((r) => r.data.data),
  unreadCount: () => api.get('/messages/unread-count').then((r) => r.data.data.count),
  history: (userId, params) => api.get(`/messages/${userId}`, { params }).then((r) => r.data.data), // { items, hasMore }
  send: (data) => api.post('/messages', data).then((r) => r.data.data),
  markRead: (userId) => api.patch(`/messages/${userId}/read`).then((r) => r.data.data),
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/messages/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data); // { url, publicId, type, name }
  },
};
