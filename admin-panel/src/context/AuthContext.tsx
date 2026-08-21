import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getToken, setToken as persistToken } from '../api/client';
import { login as loginRequest, type AuthUser } from '../api/admin';

type AuthState = {
  user: AuthUser | null;
  /** True once we've checked localStorage for an existing session. */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const USER_STORAGE_KEY = 'brokage.admin.user.v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (token && raw) {
      try {
        setUser(JSON.parse(raw) as AuthUser);
      } catch {
        // corrupt cache — treat as logged out
      }
    }
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: loggedInUser } = await loginRequest(email, password);
    if (!loggedInUser.isAdmin) {
      throw new Error('This account does not have admin access.');
    }
    persistToken(accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
