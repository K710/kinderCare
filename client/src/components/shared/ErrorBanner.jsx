import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

// Lỗi tải dữ liệu: nói rõ chuyện gì + cách sửa (thử lại)
export function ErrorBanner({ message, onRetry, className = '' }) {
  if (!message) return null;
  return (
    <div role="alert" className={`flex items-center gap-3 rounded-card border border-berry/40 bg-berry-soft px-4 py-3 text-sm text-berry ${className}`}>
      <AlertCircle size={20} strokeWidth={1.75} aria-hidden className="shrink-0" />
      <p className="flex-1">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" icon={RotateCw} onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
