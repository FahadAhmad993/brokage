import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/users', label: 'Users', icon: '👤' },
  { to: '/chats', label: 'Chats', icon: '💬' },
  { to: '/communities', label: 'Communities', icon: '👥' },
  { to: '/ads', label: 'Ads', icon: '📢' },
  { to: '/display-posts', label: 'Display Posts', icon: '🖼️' },
  { to: '/reports', label: 'Reports', icon: '🚩' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <>
      <div className="sidebar__brand">
        <span className="sidebar__mark">RE</span>
        <span>Real Estate Admin</span>
      </div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{(user?.displayName ?? '?').slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="sidebar__user-name">{user?.displayName}</div>
            <div className="sidebar__user-email">{user?.email}</div>
          </div>
        </div>
        <button type="button" className="btn btn--sm btn--ghost" onClick={logout}>
          Sign out
        </button>
      </div>
    </>
  );
}

export function DashboardLayout() {
  // Below the 860px breakpoint the fixed sidebar is hidden entirely (see
  // index.css) — previously that left mobile visitors with *no* navigation
  // at all, since nothing replaced it. This adds a top bar with a menu
  // button that opens the same nav links in a slide-in drawer instead.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const currentLabel = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label ?? 'Admin';

  return (
    <div className="shell">
      <aside className="sidebar sidebar--desktop">
        <SidebarContents />
      </aside>

      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-topbar__menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <span className="mobile-topbar__title">{currentLabel}</span>
      </div>

      {mobileNavOpen ? (
        <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)}>
          <aside
            className="sidebar mobile-nav-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="mobile-nav-drawer__close"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              ✕
            </button>
            <SidebarContents onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

