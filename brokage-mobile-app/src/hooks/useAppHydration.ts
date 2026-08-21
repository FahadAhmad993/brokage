import { useAuthStore } from '../stores/authStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useMyListingsStore } from '../stores/myListingsStore';
import { usePreferencesStore } from '../stores/preferencesStore';

/**
 * True when all persisted stores have finished loading from disk.
 * Use to avoid flashing wrong routes or stale UI on cold start.
 */
export function useAppHydration(): boolean {
  const auth = useAuthStore(s => s.hydrated);
  const prefs = usePreferencesStore(s => s.hydrated);
  const favorites = useFavoritesStore(s => s.hydrated);
  const listings = useMyListingsStore(s => s.hydrated);
  return auth && prefs && favorites && listings;
}
