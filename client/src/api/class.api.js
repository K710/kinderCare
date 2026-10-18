import { api } from './axios.js';

export const classApi = {
  list: (params) => api.get('/classes', { params }).then((r) => r.data),
  get: (id) => api.get(`/classes/${id}`).then((r) => r.data.data),
  students: (id) => api.get(`/classes/${id}/students`).then((r) => r.data.data),
  create: (data) => api.post('/classes', data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/classes/${id}`, data).then((r) => r.data.data),
  setTeachers: (id, teachers) => api.patch(`/classes/${id}/teachers`, { teachers }).then((r) => r.data.data),
  addStudents: (id, studentIds) => api.post(`/classes/${id}/students`, { studentIds }).then((r) => r.data.data),
  removeStudent: (id, studentId) => api.delete(`/classes/${id}/students/${studentId}`).then((r) => r.data),
  remove: (id) => api.delete(`/classes/${id}`).then((r) => r.data),
};
