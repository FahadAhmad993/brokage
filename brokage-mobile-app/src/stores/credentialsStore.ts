import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'brokage.credentials.v1';

type Stored = { userId: string; password: string };

/** Persists mock session password after login/register so “change password” can verify locally. */
export async function saveCredentials(userId: string, password: string): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ userId, password }));
}

export async function clearCredentials(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

async function read(): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

/**
 * Updates password when `current` matches stored value, or sets password when none stored (migration).
 */
export async function updateStoredPassword(
  userId: string,
  current: string,
  next: string,
): Promise<'ok' | 'bad_current'> {
  const s = await read();
  if (!s || s.userId !== userId) {
    await AsyncStorage.setItem(KEY, JSON.stringify({ userId, password: next }));
    return 'ok';
  }
  if (s.password !== current) {
    return 'bad_current';
  }
  await AsyncStorage.setItem(KEY, JSON.stringify({ userId, password: next }));
  return 'ok';
}
