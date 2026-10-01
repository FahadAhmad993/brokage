/**
 * Tracks messages this user has intentionally removed from their own view
 * ("Delete for me" / "Clear chat") so `messagePages.ts`'s
 * `preserveOrphanedMessages` never resurrects them.
 *
 * Why this exists: `ChatThreadScreen`'s message query now keeps showing any
 * message it has already seen even if the server stops returning it (admin
 * "clear community/inbox" and the 20-day retention sweep both hard-delete
 * rows from Supabase — the goal is that a user's own chat history survives
 * on their phone until *they* delete it, not until an admin/cron job does).
 * But from the client's point of view, a message missing from the server
 * response looks identical whether it was hard-deleted server-side or the
 * user themselves asked to delete/clear it. Without this file, "Delete for
 * me" and "Clear chat" would silently undo themselves the next time the
 * thread refetches, because the now-missing message would look like an
 * orphan worth preserving.
 *
 * Persisted to AsyncStorage (not just in-memory) so it survives app
 * restarts — otherwise reopening the app after a "Delete for me" could
 * bring the message right back on the next sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../lib/logger';

const KEY_PREFIX = 'chat:localdelete:';

export type LocalDeleteState = {
  /** Specific message ids removed via "Delete for me". */
  messageIds: string[];
  /** "Clear chat" cutoff (ISO timestamp) — any message created at or before
   *  this moment is excluded from the orphan-preserve merge, even when
   *  it's never individually listed in `messageIds`. `null` = never cleared. */
  clearedBeforeIso: string | null;
};

const EMPTY_STATE: LocalDeleteState = { messageIds: [], clearedBeforeIso: null };

function storageKey(threadId: string, userId: string) {
  return `${KEY_PREFIX}${userId}:${threadId}`;
}

/** In-memory mirror so the hot merge path (every message-page fetch) never
 *  has to await AsyncStorage — only `loadLocalDeleteState` (called once per
 *  thread open) and the record* writers touch disk. */
const memoryCache = new Map<string, LocalDeleteState>();

async function readFromDisk(
  threadId: string,
  userId: string,
): Promise<LocalDeleteState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(threadId, userId));
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<LocalDeleteState>;
    return {
      messageIds: Array.isArray(parsed.messageIds) ? parsed.messageIds : [],
      clearedBeforeIso:
        typeof parsed.clearedBeforeIso === 'string'
          ? parsed.clearedBeforeIso
          : null,
    };
  } catch (err) {
    logger.warn('localChatArchive: failed to read state', err);
    return EMPTY_STATE;
  }
}

async function writeToDisk(
  threadId: string,
  userId: string,
  state: LocalDeleteState,
) {
  memoryCache.set(storageKey(threadId, userId), state);
  try {
    await AsyncStorage.setItem(storageKey(threadId, userId), JSON.stringify(state));
  } catch (err) {
    logger.warn('localChatArchive: failed to persist state', err);
  }
}

/** Call once when a thread screen opens (and whenever threadId/userId
 *  change) to warm the in-memory cache the merge logic reads from. */
export async function loadLocalDeleteState(
  threadId: string,
  userId: string,
): Promise<LocalDeleteState> {
  const state = await readFromDisk(threadId, userId);
  memoryCache.set(storageKey(threadId, userId), state);
  return state;
}

/** Synchronous read for use inside the message-query `queryFn` — relies on
 *  `loadLocalDeleteState` having already run for this thread/user. */
export function getCachedLocalDeleteState(
  threadId: string,
  userId: string,
): LocalDeleteState {
  return memoryCache.get(storageKey(threadId, userId)) ?? EMPTY_STATE;
}

/** Call right after "Delete for me" on a single message. */
export async function recordLocalDelete(
  threadId: string,
  userId: string,
  messageId: string,
) {
  const current = memoryCache.get(storageKey(threadId, userId)) ?? EMPTY_STATE;
  if (current.messageIds.includes(messageId)) {
    return;
  }
  await writeToDisk(threadId, userId, {
    ...current,
    messageIds: [...current.messageIds, messageId],
  });
}

/** Call right after an optimistic/successful "Clear chat". */
export async function recordLocalClear(
  threadId: string,
  userId: string,
  clearedAtIso: string = new Date().toISOString(),
) {
  const current = memoryCache.get(storageKey(threadId, userId)) ?? EMPTY_STATE;
  await writeToDisk(threadId, userId, {
    ...current,
    clearedBeforeIso: clearedAtIso,
  });
}

/** Whether `message` should be excluded from the orphan-preserve merge
 *  because the user themselves removed it (not an admin/retention delete). */
export function isLocallyExcluded(
  state: LocalDeleteState,
  message: { id: string; createdAt: string },
): boolean {
  if (state.messageIds.includes(message.id)) {
    return true;
  }
  if (
    state.clearedBeforeIso &&
    new Date(message.createdAt).getTime() <=
      new Date(state.clearedBeforeIso).getTime()
  ) {
    return true;
  }
  return false;
}
