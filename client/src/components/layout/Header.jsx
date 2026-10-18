import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, UserRound } from 'lucide-react';
import { Avatar } from '../ui/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useUiStore } from '../../stores/ui.store.js';
import { titleFor } from '../../router/menus.js';
import { ROLE_LABEL } from '../../utils/constants.js';
import { notificationApi } from '../../api/notification.api.js';
import { toast } from '../../stores/toast.store.js';

// Chuông thông báo với badge số chưa đọc (poll 60s; GĐ7 sẽ cập nhật qua socket)
export function NotificationBell({ to }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => notificationApi.unreadCount().then((n) => alive && setCount(n)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <Link to={to} className="touch relative flex items-center justify-center rounded-btn text-ink-soft hover:bg-paper hover:text-ink" aria-label={`Thông báo, ${count} chưa đọc`}>
      <Bell size={22} strokeWidth={1.75} aria-hidden />
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-sun px-1 text-center text-[11px] font-semibold leading-[18px] text-ink">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

// Menu tài khoản: tên, vai trò, đăng xuất
export function UserMenu({ accountTo }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onLogout = async () => {
    await logout();
    toast.success('Đã đăng xuất');
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-btn p-1 hover:bg-paper" aria-haspopup="menu" aria-expanded={open}>
        <Avatar src={user?.avatar} name={user?.fullName} role={role} size="sm" />
        <span className="hidden text-left lg:block">
          <span className="block text-sm font-medium leading-tight">{user?.fullName}</span>
          <span className="block text-xs text-ink-soft">{ROLE_LABEL[role]}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 mt-2 w-56 overflow-hidden py-1 shadow-float">
          <div className="border-b border-line px-4 py-2 lg:hidden">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-ink-soft">{ROLE_LABEL[role]}</p>
          </div>
          {accountTo && (
            <Link to={accountTo} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-paper">
              <UserRound size={18} strokeWidth={1.75} aria-hidden /> Tài khoản của tôi
            </Link>
          )}
          <button role="menuitem" onClick={onLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-berry hover:bg-paper">
            <LogOut size={18} strokeWidth={1.75} aria-hidden /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

// Header nhân sự: nút menu (mobile), tiêu đề trang, chuông, avatar
export function Header() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const openSidebar = useUiStore((s) => s.openSidebar);
  const title = titleFor(role, pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface px-4 md:px-6">
      <button onClick={openSidebar} className="touch -ml-2 flex items-center justify-center rounded-btn text-ink-soft md:hidden" aria-label="Mở menu">
        <Menu size={24} strokeWidth={1.75} />
      </button>
      <h1 className="flex-1 truncate text-xl">{title}</h1>
      <NotificationBell to={`/${role}/notifications`} />
      <UserMenu />
    </header>
  );
}
