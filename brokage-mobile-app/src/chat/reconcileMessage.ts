import type { ChatMessage } from '../types/models';

/**
 * Merge a server or socket-delivered message into a cached list: replace an
 * optimistic row by `clientId`, or match `id`, or (when `clientId` is absent)
 * merge a single in-flight optimistic placeholder with the same author+body.
 */
export function reconcileMessage(
  list: ChatMessage[] | undefined,
  incoming: ChatMessage,
): ChatMessage[] {
  const items = list ?? [];
  let idx = items.findIndex(
    m =>
      (Boolean(incoming.clientId) && m.clientId === incoming.clientId) ||
      m.id === incoming.id,
  );
  if (idx === -1) {
    const bodyMatch = (m: ChatMessage) =>
      m.id.startsWith('optimistic-') &&
      m.threadId === incoming.threadId &&
      m.authorId === incoming.authorId &&
      m.body.trim() === incoming.body.trim() &&
      m.status === 'sending';
    const candidates = items
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => bodyMatch(m));
    if (candidates.length === 1) {
      idx = candidates[0].i;
    }
  }
  if (idx !== -1) {
    const next = items.slice();
    next[idx] = { ...items[idx], ...incoming, status: 'sent' };
    return next;
  }
  return [...items, incoming];
}
