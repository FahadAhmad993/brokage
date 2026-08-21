import { create } from 'zustand';

/**
 * Which chat thread is currently focused (user is on `ChatThread`). Used to
 * exclude that thread from unread tab badges and row badges — same idea as
 * “already reading this conversation”.
 */
type ActiveChatThreadState = {
  activeThreadId: string | null;
  setActiveThreadId: (
    id: string | null | ((prev: string | null) => string | null),
  ) => void;
};

export const useActiveChatThreadStore = create<ActiveChatThreadState>(set => ({
  activeThreadId: null,
  setActiveThreadId: idOrUpdater =>
    set(state => ({
      activeThreadId:
        typeof idOrUpdater === 'function'
          ? idOrUpdater(state.activeThreadId)
          : idOrUpdater,
    })),
}));
