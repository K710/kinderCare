import { api } from './axios.js';

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }).then((r) => r.data.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
  updateMe: (data) => api.patch('/auth/me', data).then((r) => r.data.data),
  changePassword: (currentPassword, newPassword) =>
    api.patch('/auth/me/password', { currentPassword, newPassword }).then((r) => r.data),
};
