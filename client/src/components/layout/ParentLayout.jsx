import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { Avatar } from '../ui/index.js';
import { NotificationBell, UserMenu } from './Header.jsx';
import { MobileNav } from './MobileNav.jsx';
import { PARENT_TABS } from '../../router/menus.js';
import { PATHS } from '../../router/paths.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useUiStore } from '../../stores/ui.store.js';
import { formatDateFull } from '../../utils/format.js';

// Chọn bé (khi có nhiều con) – hiển thị ở header PH
export function ChildSwitcher() {
  const { user } = useAuth();
  const children = user?.children || [];
  const selectedId = useUiStore((s) => s.selectedChildId);
  const setSelected = useUiStore((s) => s.setSelectedChild);

  // Mặc định chọn bé đầu tiên; nếu bé đã chọn không còn thì chọn lại
  useEffect(() => {
    if (!children.length) return;
    if (!children.some((c) => c._id === selectedId)) setSelected(children[0]._id);
  }, [children, selectedId, setSelected]);

  const child = useMemo(() => children.find((c) => c._id === selectedId) || children[0], [children, selectedId]);
  if (!child) return <p className="text-sm text-ink-soft">Chưa có thông tin bé</p>;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar src={child.avatar} name={child.fullName} size="md" />
      <div className="min-w-0">
        {children.length > 1 ? (
          <label className="relative block">
            <span className="sr-only">Chọn bé</span>
            <select
              value={child._id}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full appearance-none bg-transparent pr-6 font-display text-lg font-semibold leading-tight text-ink focus:outline-none"
            >
              {children.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.fullName}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          </label>
        ) : (
          <p className="truncate font-display text-lg font-semibold leading-tight">{child.fullName}</p>
        )}
        <p className="truncate text-xs text-ink-soft">
          {child.class?.name ? `${child.class.name} · ` : ''}
          {formatDateFull(new Date())}
        </p>
      </div>
    </div>
  );
}

// Tiêu đề cho các trang ngoài 5 tab (mở từ lối tắt / thông báo)
const EXTRA_TITLES = [
  [PATHS.parent.albums, 'Album ảnh'],
  [PATHS.parent.menu, 'Thực đơn tuần'],
  [PATHS.parent.growth, 'Tăng trưởng'],
  [PATHS.parent.leaveRequests, 'Đơn xin nghỉ'],
  [PATHS.parent.medicineNotes, 'Dặn thuốc'],
  [PATHS.parent.notifications, 'Thông báo'],
];
function parentTitle(pathname) {
  const tab = PARENT_TABS.find((t) => (t.end ? t.to === pathname : pathname.startsWith(t.to)));
  if (tab) {
    if (tab.to === PATHS.parent.tuitions && pathname !== tab.to) return { title: pathname.endsWith('/pay') ? 'Thanh toán học phí' : 'Biên lai học phí', back: PATHS.parent.tuitions };
    return { title: tab.label };
  }
  const extra = EXTRA_TITLES.find(([to]) => pathname.startsWith(to));
  return { title: extra?.[1] || 'KinderCare', back: PATHS.parent.root };
}

// Bố cục phụ huynh: header có bé + chuông, nội dung cột giữa 640px, tab dưới trên mobile / tab ngang trên desktop
export function ParentLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === PATHS.parent.root;
  const { title, back } = parentTitle(pathname);

  return (
    <div className="min-h-dvh pb-20 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-parent items-center gap-2 px-4">
          {back && (
            <button type="button" onClick={() => navigate(back)} className="touch -ml-2 flex items-center justify-center rounded-btn text-ink-soft hover:text-ink" aria-label="Quay lại">
              <ArrowLeft size={22} strokeWidth={1.75} aria-hidden />
            </button>
          )}
          <div className="min-w-0 flex-1">{isHome ? <ChildSwitcher /> : <h1 className="truncate text-xl">{title}</h1>}</div>
          <NotificationBell to={PATHS.parent.notifications} />
          <div className="hidden md:block">
            <UserMenu accountTo={PATHS.parent.account} />
          </div>
        </div>
        {/* Tab ngang trên desktop */}
        <nav className="hidden border-t border-line md:block" aria-label="Điều hướng chính">
          <ul className="mx-auto flex max-w-parent px-2">
            {PARENT_TABS.map(({ label, to, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    clsx('flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium', isActive ? 'border-leaf text-leaf-dark' : 'border-transparent text-ink-soft hover:text-ink')
                  }
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden /> {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-parent px-4 py-4">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
