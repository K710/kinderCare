import { useEffect } from 'react';
import clsx from 'clsx';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from '../../stores/toast.store.js';

const STYLE = {
  success: { icon: CheckCircle2, cls: 'border-leaf text-leaf-dark' },
  error: { icon: AlertCircle, cls: 'border-berry text-berry' },
  info: { icon: Info, cls: 'border-sky text-[#1F6FA8]' },
  warning: { icon: AlertTriangle, cls: 'border-sun text-[#8A6100]' },
};

function ToastItem({ item }) {
  const remove = useToastStore((s) => s.remove);
  useEffect(() => {
    const t = setTimeout(() => remove(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item, remove]);
  const { icon: Icon, cls } = STYLE[item.type] || STYLE.info;
  return (
    <div role="status" className={clsx('card pointer-events-auto flex items-start gap-3 border-l-4 px-4 py-3 shadow-float', cls)}>
      <Icon size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
      <p className="flex-1 text-sm text-ink">{item.message}</p>
      <button onClick={() => remove(item.id)} className="touch -m-2 flex items-center justify-center rounded-btn text-ink-soft hover:text-ink" aria-label="Đóng">
        <X size={18} />
      </button>
    </div>
  );
}

// Xếp chồng ở dưới giữa, trên MobileNav
export function Toaster() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {items.map((t) => (
        <div key={t.id} className="w-full max-w-md">
          <ToastItem item={t} />
        </div>
      ))}
    </div>
  );
}
