import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '../components/ui/index.js';

export default function NotFound404() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-sky-soft text-sky">
        <Compass size={32} strokeWidth={1.5} aria-hidden />
      </span>
      <h1>Không tìm thấy trang</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">Đường dẫn có thể đã đổi hoặc gõ chưa đúng.</p>
      <Button className="mt-6" onClick={() => navigate('/')}>
        Về trang chủ
      </Button>
    </main>
  );
}
