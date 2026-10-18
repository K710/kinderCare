import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { PARENT_TABS } from '../../router/menus.js';

// Tab dưới cho phụ huynh: icon 24, vùng chạm ≥ 44px, chừa safe-area
export function MobileNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden" aria-label="Điều hướng chính">
      <ul className="mx-auto flex max-w-parent">
        {PARENT_TABS.map(({ label, to, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-leaf-dark' : 'text-ink-soft')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
