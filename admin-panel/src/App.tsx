import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAdmin } from './components/RequireAdmin';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { ChatsPage } from './pages/ChatsPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { AdsPage } from './pages/AdsPage';
import { DisplayPostsPage } from './pages/DisplayPostsPage';
import { ReportsPage } from './pages/ReportsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAdmin />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="/users" replace />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/communities" element={<CommunitiesPage />} />
              <Route path="/ads" element={<AdsPage />} />
              <Route path="/display-posts" element={<DisplayPostsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
