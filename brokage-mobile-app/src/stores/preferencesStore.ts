import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'brokage.prefs.v1';

export type Preferences = {
  pushNotifications: boolean;
  emailDigest: boolean;
  marketing: boolean;
};

const defaults: Preferences = {
  pushNotifications: true,
  emailDigest: true,
  marketing: false,
};

type PrefsState = {
  prefs: Preferences;
  hydrated: boolean;
  setPrefs: (partial: Partial<Preferences>) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const usePreferencesStore = create<PrefsState>((set, get) => ({
  prefs: defaults,
  hydrated: false,

  setPrefs: async partial => {
    const next = { ...get().prefs, ...partial };
    set({ prefs: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ prefs: { ...defaults, ...JSON.parse(raw) }, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
