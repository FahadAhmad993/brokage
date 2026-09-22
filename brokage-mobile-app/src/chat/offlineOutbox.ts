/**
 * Offline message outbox — WhatsApp-style "queue while offline, auto-send on
 * reconnect" behavior.
 *
 * Why this exists:
 * Previously a message typed while offline (or during a flaky connection)
 * would sit on a React Query mutation with `networkMode: 'online'`, which
 * just *pauses* silently — nothing is persisted to disk, so if the app is
 * killed before the connection returns, the message is lost, and the UI
 * gives no "queued / will send later" feedback (no tick at all existed).
 *
 * This module persists every outgoing message to AsyncStorage the instant
 * the user hits send — before any network attempt — so:
 *   1. The message survives app restarts/crashes while offline.
 *   2. A single `NetInfo` "back online" event can flush every pending
 *      thread's queue automatically, oldest-first, without user action.
 *   3. The UI can render a real "queued" (clock) tick immediately, instead
 *      of waiting on a doomed request to time out.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { ChatMessage } from '../types/models';
import { logger } from '../lib/logger';

const OUTBOX_KEY_PREFIX = 'chat:outbox:';

export type OutboxMessage = {
  clientId: string;
  threadId: string;
  body: string;
  locationContext?: ChatMessage['locationContext'];
  imageUrl?: string;
  replyToCommunityMessage?: ChatMessage['replyToCommunityMessage'];
  /** ISO timestamp captured at enqueue time — used as the optimistic bubble's `createdAt`. */
  queuedAt: string;
};

function outboxKey(threadId: string) {
  return `${OUTBOX_KEY_PREFIX}${threadId}`;
}

async function readOutbox(threadId: string): Promise<OutboxMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(outboxKey(threadId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as OutboxMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('offlineOutbox: failed to read outbox', err);
    return [];
  }
}

async function writeOutbox(threadId: string, items: OutboxMessage[]): Promise<void> {
  try {
    if (items.length === 0) {
      await AsyncStorage.removeItem(outboxKey(threadId));
      return;
    }
    await AsyncStorage.setItem(outboxKey(threadId), JSON.stringify(items));
  } catch (err) {
    logger.warn('offlineOutbox: failed to write outbox', err);
  }
}

/** Persist a message to the outbox immediately — call this in `onMutate`,
 *  before any network attempt, so nothing is lost if the app closes. */
export async function enqueueOutboxMessage(item: OutboxMessage): Promise<void> {
  const items = await readOutbox(item.threadId);
  if (items.some(existing => existing.clientId === item.clientId)) {
    return;
  }
  items.push(item);
  await writeOutbox(item.threadId, items);
}

/** Remove a message once it has been confirmed sent (or permanently failed
 *  for a non-connectivity reason, e.g. blocked user / validation error). */
export async function removeOutboxMessage(
  threadId: string,
  clientId: string,
): Promise<void> {
  const items = await readOutbox(threadId);
  const next = items.filter(m => m.clientId !== clientId);
  if (next.length !== items.length) {
    await writeOutbox(threadId, next);
  }
}

export async function getOutboxMessages(threadId: string): Promise<OutboxMessage[]> {
  return readOutbox(threadId);
}

/** All thread ids that currently have pending outbox messages — used by
 *  `flushAllOutboxes` to sweep every open conversation on reconnect, not
 *  just the one currently on screen. */
async function getAllOutboxThreadIds(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter(k => k.startsWith(OUTBOX_KEY_PREFIX))
      .map(k => k.slice(OUTBOX_KEY_PREFIX.length));
  } catch (err) {
    logger.warn('offlineOutbox: failed to list outbox threads', err);
    return [];
  }
}

export type OutboxSendFn = (item: OutboxMessage) => Promise<ChatMessage>;

export type OutboxFlushCallbacks = {
  /** Called the moment a queued message is confirmed by the server. */
  onSent?: (item: OutboxMessage, message: ChatMessage) => void;
  /** Called only for a *real* rejection (validation, blocked user, etc.) —
   *  connectivity failures are left in the queue and retried later. */
  onFailed?: (item: OutboxMessage, error: unknown) => void;
};

/** A thrown error is treated as "connectivity" (keep retrying) unless it
 *  carries a recognizable server rejection shape/message. Network layer
 *  errors from `fetch`/socket timeouts surface as generic `Error` objects
 *  with these kinds of messages; anything else (4xx validation messages,
 *  "blocked", "not found", etc.) is treated as permanent. */
export function isConnectivityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('socket') ||
    msg.length === 0
  );
}

let flushInFlight = new Set<string>();

/** Sends every queued message for one thread, oldest first, stopping at the
 *  first connectivity failure (so ordering is preserved and we don't hammer
 *  a dead connection). Safe to call repeatedly — re-entrant calls for the
 *  same thread are ignored while one is already running. */
export async function flushOutboxForThread(
  threadId: string,
  send: OutboxSendFn,
  cb?: OutboxFlushCallbacks,
): Promise<void> {
  if (flushInFlight.has(threadId)) {
    return;
  }
  flushInFlight.add(threadId);
  try {
    let items = await readOutbox(threadId);
    for (const item of items) {
      try {
        const message = await send(item);
        await removeOutboxMessage(threadId, item.clientId);
        cb?.onSent?.(item, message);
      } catch (err) {
        if (isConnectivityError(err)) {
          // Still offline / server unreachable — stop here, keep the rest
          // queued, try again on the next reconnect event.
          return;
        }
        // Genuine rejection — drop it and let the UI show a retry option.
        await removeOutboxMessage(threadId, item.clientId);
        cb?.onFailed?.(item, err);
      }
      items = await readOutbox(threadId);
    }
  } finally {
    flushInFlight.delete(threadId);
  }
}

export async function flushAllOutboxes(
  send: OutboxSendFn,
  cb?: OutboxFlushCallbacks,
): Promise<void> {
  const threadIds = await getAllOutboxThreadIds();
  await Promise.all(threadIds.map(id => flushOutboxForThread(id, send, cb)));
}

let unsubscribeNetInfo: (() => void) | null = null;

/** Wires a single app-wide `NetInfo` listener that flushes every pending
 *  outbox the moment connectivity returns — this is the piece that makes
 *  queued messages "just send themselves" once the internet comes back,
 *  without the user needing to reopen the thread or tap retry. Call once
 *  from `AppProviders` after login; call `stopOutboxAutoFlush` on logout. */
export function startOutboxAutoFlush(
  send: OutboxSendFn,
  cb?: OutboxFlushCallbacks,
): void {
  if (unsubscribeNetInfo) {
    return;
  }
  // Sweep once on startup too, in case messages were queued in a previous
  // session and the app is opening back online.
  void NetInfo.fetch().then(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void flushAllOutboxes(send, cb);
    }
  });
  unsubscribeNetInfo = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void flushAllOutboxes(send, cb);
    }
  });
}

export function stopOutboxAutoFlush(): void {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
}
