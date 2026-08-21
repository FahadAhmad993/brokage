import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/users', label: 'Users', icon: '👤' },
  { to: '/communities', label: 'Communities', icon: '💬' },
  { to: '/ads', label: 'Ads', icon: '📢' },
  { to: '/reports', label: 'Reports', icon: '🚩' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__mark">RE</span>
          <span>Real Estate Admin</span>
        </div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
