import clsx from 'clsx';
import { initials } from '../../utils/format.js';

const SIZE = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-xl' };
const RING = { admin: 'ring-role-admin', principal: 'ring-role-principal', teacher: 'ring-role-teacher', parent: 'ring-role-parent' };

// Avatar: ảnh hoặc chữ cái đầu; viền màu vai trò (chỉ dùng cho người, không cho bé)
export function Avatar({ src, name = '', role, size = 'md', className }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-leaf-soft font-display font-semibold text-leaf-dark',
        SIZE[size],
        role && clsx('ring-2 ring-offset-2 ring-offset-surface', RING[role]),
        className,
      )}
      aria-label={name}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name) || '?'}
    </span>
  );
}
