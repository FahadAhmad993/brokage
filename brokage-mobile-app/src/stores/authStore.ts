import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { clearSessionToken } from '../api/client';
import type { User } from '../types/models';
import { clearCredentials } from './credentialsStore';

const STORAGE_KEY = 'brokage.auth.v1';

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => Promise<void>;
  updateProfile: (
    updates: Partial<
      Pick<User, 'displayName' | 'avatarUri' | 'email' | 'phone' | 'estateName'>
    >,
  ) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,

  setUser: async user => {
    set({ user });
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await clearSessionToken();
      await clearCredentials();
    }
  },

  updateProfile: async updates => {
    const cur = get().user;
    if (!cur) {
      return;
    }
    const next: User = { ...cur, ...updates };
    set({ user: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const user = JSON.parse(raw) as User;
        set({ user, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
