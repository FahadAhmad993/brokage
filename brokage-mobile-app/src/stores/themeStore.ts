import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { applyTheme } from '../theme/colors';
import type { ThemeName } from '../theme/themePresets';

const STORAGE_KEY = 'brokage.theme.v1';

type ThemeState = {
  themeName: ThemeName;
  hydrated: boolean;
  /**
   * Bumped on every theme change. `App.tsx` folds this into its remount
   * `key` (alongside the existing error-boundary `recoverKey`) so the whole
   * tree re-renders and every screen picks up the mutated `colors` object —
   * no theme context/hook needs to be threaded through existing screens.
   */
  version: number;
  setTheme: (name: ThemeName) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: 'dark',
  hydrated: false,
  version: 0,

  setTheme: async name => {
    if (get().themeName === name) {
      return;
    }
    applyTheme(name);
    set(s => ({ themeName: name, version: s.version + 1 }));
    try {
      await AsyncStorage.setItem(STORAGE_KEY, name);
    } catch {
      // Non-fatal — theme just won't survive an app restart this time.
    }
  },

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const name = (raw as ThemeName | null) ?? 'dark';
      applyTheme(name);
      set(s => ({ themeName: name, hydrated: true, version: s.version + 1 }));
    } catch {
      set({ hydrated: true });
    }
  },
}));
