/**
 * Stable equality for UUIDs from navigation, JWT, sockets (trim + lowercase).
 */
export function sameId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null || b == null) {
    return false;
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Unread badges read from REST + Socket.IO payloads. Serialized JSON normally
 * uses numbers but some gateways / older builds can stringify counts — never
 * use `Number.isFinite(raw)` on the raw prop (numeric strings silently fail).
 *
 * Payloads may use camelCase (`unreadCount`) or snake_case (`unread_count`).
 */
export function unreadFromThreadWire(thread: unknown): unknown {
  if (!thread || typeof thread !== 'object') {
    return undefined;
  }
  const r = thread as Record<string, unknown>;
  return r.unreadCount ?? r.unread_count;
}

export function parseOptionalThreadUnread(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string' && /\S/.test(value.trim())) {
    const n = Number.parseInt(value.trim(), 10);
    return Number.isFinite(n) ? Math.max(0, n) : undefined;
  }
  return undefined;
}

export function displayThreadUnread(value: unknown): number {
  return parseOptionalThreadUnread(value) ?? 0;
}
