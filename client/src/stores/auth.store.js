import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * accessToken chỉ giữ trong bộ nhớ (không persist) – an toàn hơn localStorage.
 * user được persist để render nhanh; bootstrap() dùng cookie refresh lấy token mới khi tải trang.
 * status: 'idle' | 'loading' | 'ready'
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      status: 'idle',

      setSession: ({ accessToken, user }) => set({ accessToken, user: user ?? get().user, status: 'ready' }),
      clearSession: () => set({ accessToken: null, user: null, status: 'ready' }),

      bootstrap: async () => {
        if (get().status !== 'idle') return;
        set({ status: 'loading' });
        try {
          const { refreshAccessToken } = await import('../api/axios.js');
          await refreshAccessToken(); // setSession được gọi bên trong
        } catch {
          set({ accessToken: null, user: null });
        } finally {
          set({ status: 'ready' });
        }
      },

      login: async (identifier, password) => {
        const { authApi } = await import('../api/auth.api.js');
        const data = await authApi.login(identifier, password);
        set({ accessToken: data.accessToken, user: data.user, status: 'ready' });
        return data.user;
      },

      logout: async () => {
        try {
          const { authApi } = await import('../api/auth.api.js');
          await authApi.logout();
        } catch {
          /* vẫn xoá phiên phía client */
        }
        set({ accessToken: null, user: null, status: 'ready' });
      },

      // Cập nhật user (đổi tên, avatar, danh sách con)
      setUser: (user) => set({ user }),
    }),
    {
      name: 'kc-auth',
      partialize: (s) => ({ user: s.user }), // KHÔNG lưu accessToken
    },
  ),
);
