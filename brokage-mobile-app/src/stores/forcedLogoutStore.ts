import { create } from 'zustand';

type ForcedLogoutState = {
  /** Set when the API rejects the session because an admin blocked/disabled
   *  the account. `null` means "not currently showing the forced-logout screen". */
  reason: string | null;
  trigger: (reason: string | null) => void;
  clear: () => void;
};

/**
 * Separate from `authStore` on purpose: `authStore.user` is cleared
 * immediately (so navigation falls back to the Auth stack), but we still
 * need to carry the admin's reason across that transition so the login
 * screen can show a dedicated "account disabled" screen instead of the
 * normal login form.
 */
export const useForcedLogoutStore = create<ForcedLogoutState>(set => ({
  reason: null,
  trigger: reason => set({ reason: reason ?? 'Your account was disabled by an admin.' }),
  clear: () => set({ reason: null }),
}));
