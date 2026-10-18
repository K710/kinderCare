import { api } from './axios.js';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const albumApi = {
  list: (params) => api.get('/albums', { params }).then((r) => r.data),
  get: (id) => api.get(`/albums/${id}`).then((r) => r.data.data),
  // data: { title, description?, class, date? }, files: File[]
  create: (data, files = [], onProgress) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => v !== undefined && v !== '' && fd.append(k, v));
    files.forEach((f) => fd.append('photos', f));
    return api.post('/albums', fd, { ...multipart, onUploadProgress: onProgress }).then((r) => r.data.data);
  },
  update: (id, data) => api.patch(`/albums/${id}`, data).then((r) => r.data.data),
  addPhotos: (id, files, onProgress) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    return api.post(`/albums/${id}/photos`, fd, { ...multipart, onUploadProgress: onProgress }).then((r) => r.data.data);
  },
  setCaption: (id, photoId, caption) => api.patch(`/albums/${id}/photos/${photoId}`, { caption }).then((r) => r.data.data),
  removePhoto: (id, photoId) => api.delete(`/albums/${id}/photos/${photoId}`).then((r) => r.data.data),
  remove: (id) => api.delete(`/albums/${id}`).then((r) => r.data),
};
