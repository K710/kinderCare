import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/index.jsx';
import { useAuthStore } from './stores/auth.store.js';
import { Toaster } from './components/ui/Toast.jsx';

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  // Khi tải trang: lấy access token mới từ cookie refresh (token chỉ giữ trong bộ nhớ)
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
