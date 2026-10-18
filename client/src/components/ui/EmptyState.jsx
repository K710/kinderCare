import { Button } from './Button.jsx';

// Empty state mời hành động: "Chưa có ảnh nào hôm nay. Đăng ảnh hoạt động đầu tiên."
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className = '' }) {
  return (
    <div className={`card flex flex-col items-center px-6 py-10 text-center ${className}`}>
      {Icon && (
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink-soft">
          <Icon size={24} strokeWidth={1.5} aria-hidden />
        </span>
      )}
      <h3 className="text-lg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {actionLabel && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
