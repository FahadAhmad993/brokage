import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAdmin() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="boot-screen">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
