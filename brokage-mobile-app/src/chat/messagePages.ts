import type { InfiniteData } from '@tanstack/react-query';
import type { ChatMessage, ChatMessageStatus } from '../types/models';
import { reconcileMessage } from './reconcileMessage';

export type MessagesPageResult = {
  items: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
};

/** Flatten + dedupe by id for timeline rendering. */
export function flattenMessagePages(
  data: InfiniteData<MessagesPageResult> | undefined,
): ChatMessage[] {
  if (!data?.pages?.length) {
    return [];
  }
  const byId = new Map<string, ChatMessage>();
  for (const page of data.pages) {
    for (const m of page.items) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function mergeIncomingIntoMessagesInfinite(
  old: InfiniteData<MessagesPageResult> | undefined,
  message: ChatMessage,
): InfiniteData<MessagesPageResult> | undefined {
  // Don't seed an empty cache for messages arriving over the socket. If the
  // user has never opened this thread, the cache is undefined; seeding a
  // fake single-page result here would trap them with `hasNext: false`, so
  // `useInfiniteQuery.fetchNextPage` can never load real history. Let the
  // query do its own page-1 fetch the next time the thread is opened — the
  // server already has the message and will return it as part of page 1
  // (newest-first).
  if (!old?.pages?.length) {
    return old;
  }
  const first = old.pages[0];
  const mergedItems = reconcileMessage(first.items, message);
  return {
    ...old,
    pages: [{ ...first, items: mergedItems }, ...old.pages.slice(1)],
  };
}

/**
 * Same merge as above, but for the sender's *own* optimistic/queued/offline
 * message. Unlike a socket push, this one is safe (and necessary) to seed
 * an empty cache with: if the thread was opened for the first time while
 * offline (or the persisted cache hasn't hydrated yet), `old` can be
 * `undefined`/empty, and previously the message would simply vanish — the
 * composer would clear but nothing would appear on screen. A single
 * synthetic page here means "send while offline with an empty thread"
 * always renders immediately; the next successful `fetchNextPage`/refetch
 * reconciles it with real server history via `reconcileMessage`'s id/
 * clientId matching, so it doesn't create a duplicate once real data loads.
 */
export function seedOrMergeOwnMessage(
  old: InfiniteData<MessagesPageResult> | undefined,
  message: ChatMessage,
): InfiniteData<MessagesPageResult> {
  if (!old?.pages?.length) {
    return {
      pages: [
        {
          items: [message],
          pagination: { page: 1, limit: 50, total: 1, hasNext: false },
        },
      ],
      pageParams: [undefined],
    };
  }
  const first = old.pages[0];
  const mergedItems = reconcileMessage(first.items, message);
  return {
    ...old,
    pages: [{ ...first, items: mergedItems }, ...old.pages.slice(1)],
  };
}

export function mapMessagesInInfinitePages(
  old: InfiniteData<MessagesPageResult> | undefined,
  mapFn: (m: ChatMessage) => ChatMessage,
): InfiniteData<MessagesPageResult> | undefined {
  if (!old?.pages?.length) {
    return old;
  }
  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      items: page.items.map(mapFn),
    })),
  };
}

export function markMessageClientStatusInPages(
  old: InfiniteData<MessagesPageResult> | undefined,
  clientId: string,
  status: ChatMessageStatus,
): InfiniteData<MessagesPageResult> | undefined {
  return mapMessagesInInfinitePages(old, m =>
    m.clientId === clientId ? { ...m, status } : m,
  );
}

/** Drop messages matching `predicate` from every cached page — used for
 *  "delete for me" (remove one) and "clear all messages" (remove every). */
export function filterMessagesInInfinitePages(
  old: InfiniteData<MessagesPageResult> | undefined,
  predicate: (m: ChatMessage) => boolean,
): InfiniteData<MessagesPageResult> | undefined {
  if (!old?.pages?.length) {
    return old;
  }
  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      items: page.items.filter(predicate),
    })),
  };
}
