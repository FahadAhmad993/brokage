/** Shared display helpers for signed-in user — keep in sync with profile / headers. */

export function initialsFromDisplay(
  displayName: string | undefined,
  email: string | undefined,
): string {
  const n = displayName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const local = email?.split('@')[0] ?? '';
  return local.slice(0, 2).toUpperCase() || '?';
}

export function firstNameFromDisplay(
  displayName: string | undefined,
): string | undefined {
  const n = displayName?.trim();
  if (!n) {
    return undefined;
  }
  return n.split(/\s+/)[0];
}
