import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Sprout, X } from 'lucide-react';
import { MENUS } from '../../router/menus.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useUiStore } from '../../stores/ui.store.js';
import { ROLE_LABEL } from '../../utils/constants.js';

const ROLE_BAR = { admin: 'bg-role-admin', principal: 'bg-role-principal', teacher: 'bg-role-teacher', parent: 'bg-role-parent' };

function MenuList({ role, collapsed, onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 px-2 py-3" aria-label="Menu chính">
      {(MENUS[role] || []).map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors',
              collapsed && 'justify-center px-0',
              isActive ? 'bg-leaf-soft text-leaf-dark' : 'text-ink-soft hover:bg-paper hover:text-ink',
            )
          }
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand({ collapsed }) {
  return (
    <div className={clsx('flex h-16 items-center gap-2 border-b border-line px-4', collapsed && 'justify-center px-0')}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf">
        <Sprout size={20} strokeWidth={1.75} aria-hidden />
      </span>
      {!collapsed && <span className="font-display text-lg font-bold text-ink">KinderCare</span>}
    </div>
  );
}

// Desktop ≥1024: 240px đầy đủ · 768–1023: thu gọn còn icon · <768: drawer
export function Sidebar() {
  const { role } = useAuth();
  const open = useUiStore((s) => s.sidebarOpen);
  const close = useUiStore((s) => s.closeSidebar);

  return (
    <>
      {/* Cố định trên md+ */}
      <aside className="relative hidden shrink-0 flex-col border-r border-line bg-surface md:flex md:w-16 lg:w-60">
        <span className={clsx('absolute inset-y-0 left-0 w-1', ROLE_BAR[role])} aria-hidden />
        <div className="hidden lg:block">
          <Brand />
          <MenuList role={role} />
        </div>
        <div className="lg:hidden">
          <Brand collapsed />
          <MenuList role={role} collapsed />
        </div>
        <p className="hidden border-t border-line px-4 py-3 text-xs text-ink-soft lg:block">{ROLE_LABEL[role]}</p>
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-ink/40" onClick={close} aria-label="Đóng menu" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-float">
            <span className={clsx('absolute inset-y-0 left-0 w-1', ROLE_BAR[role])} aria-hidden />
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <button onClick={close} className="touch flex items-center justify-center rounded-btn text-ink-soft" aria-label="Đóng">
                <X size={22} />
              </button>
            </div>
            <MenuList role={role} onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
