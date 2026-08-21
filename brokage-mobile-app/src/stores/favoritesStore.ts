import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'brokage.favorites.v1';

type FavState = {
  ids: Set<string>;
  hydrated: boolean;
  toggle: (propertyId: string) => Promise<void>;
  has: (propertyId: string) => boolean;
  hydrate: () => Promise<void>;
};

export const useFavoritesStore = create<FavState>((set, get) => ({
  ids: new Set(),
  hydrated: false,

  has: propertyId => get().ids.has(propertyId),

  toggle: async propertyId => {
    const next = new Set(get().ids);
    if (next.has(propertyId)) {
      next.delete(propertyId);
    } else {
      next.add(propertyId);
    }
    set({ ids: next });
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(next)),
    );
  },

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        set({ ids: new Set(arr), hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
