import { useAuthStore } from '../stores/auth.store.js';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  return {
    user,
    role: user?.role || null,
    isAuthenticated: !!accessToken && !!user,
    isReady: status === 'ready',
    login,
    logout,
  };
}
