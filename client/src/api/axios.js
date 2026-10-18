import axios from 'axios';
import { useAuthStore } from '../stores/auth.store.js';

const baseURL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

export const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

// Instance riêng cho refresh để không bị interceptor lặp
const bare = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh một lần cho nhiều request 401 đồng thời
let refreshing = null;
async function refreshAccessToken() {
  if (!refreshing) {
    refreshing = bare
      .post('/auth/refresh')
      .then((res) => {
        const { accessToken, user } = res.data.data;
        useAuthStore.getState().setSession({ accessToken, user });
        return accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const code = response?.data?.code;
    const isAuthRoute = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');

    // Access token hết hạn → refresh rồi gọi lại đúng 1 lần
    if (response?.status === 401 && !config._retried && !isAuthRoute && code !== 'BAD_CREDENTIALS') {
      config._retried = true;
      try {
        const token = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      } catch {
        useAuthStore.getState().clearSession();
      }
    }
    return Promise.reject(error);
  },
);

// Lấy thông điệp lỗi hiển thị cho người dùng
export function errorMessage(err, fallback = 'Có lỗi xảy ra, thử lại sau') {
  const d = err?.response?.data;
  if (d?.errors?.length) return d.errors.map((e) => e.message).join('. ');
  return d?.message || (err?.code === 'ECONNABORTED' ? 'Kết nối quá chậm, thử lại' : fallback);
}

export { refreshAccessToken, bare };
