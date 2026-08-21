/**
 * Single network layer for the admin panel — every call goes through
 * `apiRequest`, which unwraps the backend's `{ success, data }` envelope
 * and attaches the bearer token automatically. Mirrors the pattern used in
 * the mobile app's `src/api/client.ts` so the two stay easy to reason about
 * side by side.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000/api/v1';

const TOKEN_STORAGE_KEY = 'brokage.admin.token.v1';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function formatErrorBody(parsed: unknown, status: number): string {
  if (!parsed || typeof parsed !== 'object') {
    return typeof parsed === 'string' && parsed.trim() ? parsed : `Request failed (${status})`;
  }
  const payload = parsed as { message?: string | string[] };
  const msg = Array.isArray(payload.message) ? payload.message.join('; ') : payload.message;
  return msg || `Request failed (${status})`;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired/invalid/account blocked — drop it so the app falls
      // back to the login screen on next render.
      setToken(null);
    }
    throw new ApiError(formatErrorBody(parsed, res.status), res.status);
  }
  if (parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
