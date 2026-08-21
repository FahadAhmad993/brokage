import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import {
  connectChatSocket,
  onIncomingChatMessage,
  onSocketReconnect,
  onThreadUpdate,
} from '../api/client';
import { API_MODE } from '../config/appConfig';
import {
  mergeIncomingIntoMessagesInfinite,
  type MessagesPageResult,
} from './messagePages';
import {
  parseOptionalThreadUnread,
  sameId,
  unreadFromThreadWire,
} from './threadUnread';
import { useActiveChatThreadStore } from '../stores/activeChatThreadStore';
import type { ChatMessage, ChatThread } from '../types/models';

/**
 * Socket.IO chat sync aligned with common production patterns:
 *
 * | Transport | Use |
 * |-----------|-----|
 * | `user:<id>` room (server-side) | `thread:update` → inbox order, last preview, unread counts |
 * | Thread room via `thread:join` | `message:new`, typing, read receipts while viewing |
 *
 * | Client responsibility |
 * |-----------------------|
 * | Merge `message:new` into the cache only when the cache already exists | Honest pagination state |
 * | Merge `thread:update` into `['threads']` with guarded `unreadCount` | Inbox badges |
 * | Invalidate `threads` on socket reconnect; app resume invalidates messages for open thread only | Stale inbox GET must not overwrite `thread:update` merges |
 */
export function subscribeChatRealtimeSync(
  queryClient: QueryClient,
  userId: string,
): () => void {
  if (API_MODE !== 'live') {
    return () => {};
  }

  const invalidateThreadsAndActiveMessagesRemote = () => {
    void queryClient.invalidateQueries({ queryKey: ['threads', userId] });
    const activeId = useActiveChatThreadStore.getState().activeThreadId;
    if (activeId) {
      void queryClient.invalidateQueries({
        queryKey: ['messages', activeId, userId],
      });
    }
  };

  /**
   * After resume from background, refetch messages for the focused thread only.
   * Do **not** invalidate `threads` here: a racing `GET /chats/threads` often
   * lands snapshot-before-last-socket-push and replaces `unreadCount` the UI
   * was already merging from `thread:update`.
   */
  const catchUpForeground = () => {
    void connectChatSocket();
    const activeId = useActiveChatThreadStore.getState().activeThreadId;
    if (activeId) {
      void queryClient.invalidateQueries({
        queryKey: ['messages', activeId, userId],
      });
    }
  };

  const offThread = onThreadUpdate(thread => {
    const activeId = useActiveChatThreadStore.getState().activeThreadId;
    queryClient.setQueryData<ChatThread[] | undefined>(
      ['threads', userId],
      prev => {
        const list = prev ?? [];
        const idx = list.findIndex(t => sameId(t.id, thread.id));
        const prior = idx >= 0 ? list[idx] : undefined;

        const incomingU = parseOptionalThreadUnread(unreadFromThreadWire(thread));
        const priorU = parseOptionalThreadUnread(unreadFromThreadWire(prior));
        let unread =
          incomingU !== undefined ? incomingU : priorU !== undefined ? priorU : 0;

        if (activeId != null && sameId(thread.id, activeId) && unread > 0) {
          unread = 0;
        }

        const normalised = { ...thread, unreadCount: unread };

        if (idx === -1) {
          return [normalised, ...list];
        }
        const next = [...list];
        next.splice(idx, 1);
        return [normalised, ...next];
      },
    );
  });

  const offMessage = onIncomingChatMessage((message: ChatMessage) => {
    queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
      ['messages', message.threadId, userId],
      old => mergeIncomingIntoMessagesInfinite(old, message),
    );
    /**
     * Intentionally NO `invalidateQueries(['threads'])` here: periodic REST
     * refetches raced `message:send` + socket `thread:update` ordering and caused
     * tab badges to flash "1". Server now fans out `thread:update` **before**
     * `message:new`; counts reconcile from that envelope + foreground catch-up.
     */
  });

  const offReconnect = onSocketReconnect(invalidateThreadsAndActiveMessagesRemote);

  const onAppState = (state: AppStateStatus) => {
    if (state !== 'active') {
      return;
    }
    catchUpForeground();
  };
  const appSub = AppState.addEventListener('change', onAppState);

  return () => {
    offThread();
    offMessage();
    offReconnect();
    appSub.remove();
  };
}
