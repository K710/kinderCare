import { api } from './axios.js';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const uploadApi = {
  image: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload/image', fd, multipart).then((r) => r.data.data); // { url, publicId }
  },
  images: (files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return api.post('/upload/images', fd, multipart).then((r) => r.data.data); // [{ url, publicId }]
  },
};
