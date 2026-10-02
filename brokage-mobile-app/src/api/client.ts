import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { useActiveChatThreadStore } from '../stores/activeChatThreadStore';
import { API_BASE_URL, API_MODE } from '../config/appConfig';
import { logger } from '../lib/logger';
import { uuidV4 } from '../lib/uuid';
import type { MessagesPageResult } from '../chat/messagePages';
import { parseOptionalThreadUnread, unreadFromThreadWire } from '../chat/threadUnread';
import type {
  ChatMessage,
  ChatThread,
  ChatListingRef,
  DisplayBrokerCard,
  DisplayPost,
  DisplayPostConfig,
  DisplayProfile,
  ManagedListing,
  Property,
  PropertyCategory,
  PropertyLister,
  PublicUserProfile,
  User,
} from '../types/models';
import type { ListingFormValues } from '../types/listingForm';
import { useMyListingsStore } from '../stores/myListingsStore';
import {
  appendMessage,
  buildInitialThreads,
  ensureDirectThread,
  ensureListingIntroMessage,
  getMessages,
  MOCK_PROPERTIES,
  seedMessagesIfNeeded,
} from './mockData';


// adds code 1 start
export type AdStatus = 'pending' | 'active' | 'expired' | 'rejected';

export type CommunityPost = {
  id: string;
  userId: string;
  title: string;
  description: string;
  city: string;
  area: string;
  images: string[];
  durationHours: number;
  price: number;
  status: AdStatus;
  expiresAt: string | null;
  remainingSeconds: number | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;

  // Returned by GET /community/posts
  authorName?: string;
  authorAvatarUrl?: string | null;
};


export async function createDirectChatFromCommunityAd(
  ownerId: string,
): Promise<ChatThread> {
  if (API_MODE !== 'live') {
    return ensureDirectThread(
      ownerId,
      'Chat',
    );
  }

  const data = await apiRequest<ChatThread>(
    '/chats/threads',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'direct',
        title: 'Chat',
        peerUserId: ownerId,
      }),
    },
  );

  return normalizeThread(data);
}

export function communityPostToChatListing(
  post: CommunityPost,
): ChatListingRef {
  return {
    id: post.id,
    title: post.title,
    imageUrl: post.images?.[0] ?? '',
    location: post.city,
    priceMonthly: 0,
  };
}


export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  return apiRequest<CommunityPost[]>('/community/posts');
}

/** Current user's own ads, any status (pending/active/expired/rejected) — "My Ads" screen. */
export async function fetchMyCommunityPosts(): Promise<CommunityPost[]> {
  return apiRequest<CommunityPost[]>('/community/posts/mine');
}

/** Price preview shown live under the duration picker, before the user posts. */
export async function quoteCommunityPostPrice(
  durationHours: number,
): Promise<{ durationHours: number; price: number }> {
  return apiRequest(`/community/posts/quote?durationHours=${durationHours}`);
}

export async function createCommunityPost(data: {
  title: string;
  description: string;
  city: string;
  area: string;
  images: string[];
  durationHours: number;
}): Promise<CommunityPost> {
  return apiRequest('/community/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
//  adds code 1 end

// ---- Display (Profile → Display) ---------------------------------------

/** Live pricing + image bounds — used to build the "Add Post" form. */
export async function fetchDisplayConfig(): Promise<DisplayPostConfig> {
  return apiRequest<DisplayPostConfig>('/display/config');
}

/** Price preview shown live under the duration picker, before posting. */
export async function quoteDisplayPostPrice(
  durationHours: number,
): Promise<{ durationHours: number; price: number }> {
  return apiRequest(`/display/quote?durationHours=${durationHours}`);
}

/** My own Display — every post regardless of status, for "My Display". */
export async function fetchMyDisplayPosts(): Promise<DisplayPost[]> {
  return apiRequest<DisplayPost[]>('/display/mine');
}

/** Someone else's Display — only their live (active/sold) posts. */
export async function fetchUserDisplayPosts(userId: string): Promise<DisplayPost[]> {
  return apiRequest<DisplayPost[]>(`/display/user/${userId}`);
}

export async function fetchMyDisplayProfile(): Promise<DisplayProfile> {
  return apiRequest<DisplayProfile>('/display/mine/profile');
}

export async function fetchUserDisplayProfile(userId: string): Promise<DisplayProfile> {
  return apiRequest<DisplayProfile>(`/display/user/${userId}/profile`);
}

export async function setMyDisplayCover(coverImageUrl: string | null): Promise<DisplayProfile> {
  return apiRequest<DisplayProfile>('/display/mine/profile', {
    method: 'PATCH',
    body: JSON.stringify({ coverImageUrl }),
  });
}

export async function createDisplayPost(data: {
  images: string[];
  marlaSize: number;
  city?: string;
  area?: string;
  description?: string;
  extraFields?: Record<string, string>;
  durationHours: number;
}): Promise<DisplayPost> {
  return apiRequest<DisplayPost>('/display', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDisplayPost(
  id: string,
  data: Partial<{
    images: string[];
    marlaSize: number;
    city: string;
    area: string;
    description: string;
    extraFields: Record<string, string>;
  }>,
): Promise<DisplayPost> {
  return apiRequest<DisplayPost>(`/display/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDisplayPost(id: string): Promise<{ success: boolean }> {
  return apiRequest(`/display/${id}`, { method: 'DELETE' });
}

export async function markDisplayPostSold(id: string): Promise<DisplayPost> {
  return apiRequest<DisplayPost>(`/display/${id}/sold`, { method: 'PATCH' });
}

/** Count me as a visitor of this post (server dedupes per user, ignores the owner). */
export async function recordDisplayPostView(
  id: string,
): Promise<{ postId: string; viewCount: number }> {
  return apiRequest(`/display/${id}/view`, { method: 'POST' });
}

/** Community search bar → broker cards grid (e.g. query "5 marla"). */
export async function searchDisplayBrokers(query: string): Promise<DisplayBrokerCard[]> {
  return apiRequest<DisplayBrokerCard[]>(`/display/search?q=${encodeURIComponent(query)}`);
}



const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const TOKEN_STORAGE_KEY = 'brokage.api.token.v1';
let accessToken: string | null = null;

type TypingPayload = {
  threadId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
};
type PresencePayload = {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeenAt?: string | null;
};
export type MessageReadPayload = {
  threadId: string;
  userId: string;
  readAt: string;
};
export type MessageDeletedPayload = {
  threadId: string;
  messageId: string;
};

/**
 * Single owner of the chat socket lifecycle. Subscribers register against this
 * registry (not the underlying Socket instance) so they survive reconnects and
 * user changes. `connectChatSocket()` is the only place an `io(...)` is created.
 */
export type DisplayViewsPayload = { postId: string; viewCount: number };

const chat = {
  socket: null as Socket | null,
  /** Coalesces parallel `connectChatSocket()` calls into one `io(...)` instance. */
  connecting: null as Promise<Socket | null> | null,
  /** Threads the user has opened — re-emitted as `thread:join` after each reconnect. */
  joinedThreads: new Set<string>(),
  /** Display posts whose live visitor count we're watching — replayed on reconnect. */
  watchedDisplayPosts: new Set<string>(),
  /**
   * Tracks `socket.id + threadId` pairs that already emitted `thread:join` on this connection.
   * Without this every `send()` would re-emit join → redundant mark-read + `thread:update` bursts
   * that reorder against `message:send` and make unread badges oscillate ("1 then hide").
   */
  threadJoinEmittedForSocket: new Set<string>(),
  /** Becomes true after the first successful connect; lets `reconnect` subscribers
   *  distinguish initial connects from reconnects (so they only refetch on the latter). */
  hasEverConnected: false,
  presence: new Map<string, { isOnline: boolean; lastSeenAt?: string | null }>(),
  subs: {
    message: new Set<(m: ChatMessage) => void>(),
    typing: new Set<(p: TypingPayload) => void>(),
    thread: new Set<(t: ChatThread) => void>(),
    presence: new Set<(p: PresencePayload) => void>(),
    read: new Set<(p: MessageReadPayload) => void>(),
    deleted: new Set<(p: MessageDeletedPayload) => void>(),
    displayViews: new Set<(p: DisplayViewsPayload) => void>(),
    /** Every successful socket connect (including first login connect). */
    connect: new Set<() => void>(),
    reconnect: new Set<() => void>(),
  },
};

if (API_MODE === 'live') {
  logger.info('Using live API mode');
}

export function errorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
}

async function ensureTokenLoaded() {
  if (accessToken !== null) {
    return accessToken;
  }
  const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  accessToken = stored;
  return accessToken;
}

async function notifyAccountDisabled(reason: string | null) {
  try {
    const { useAuthStore } = await import('../stores/authStore');
    const { useForcedLogoutStore } = await import('../stores/forcedLogoutStore');
    useForcedLogoutStore.getState().trigger(reason);
    // Clears the token/session and flips RootNavigator back to the Auth
    // stack, where the forced-logout reason above takes over the screen.
    await useAuthStore.getState().setUser(null);
  } catch {
    // Best-effort — worst case the user just sees the generic 401 error
    // and has to log out manually.
  }
}

async function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/** Flatten Nest/class-validator error payloads for logging and matching. */
function formatApiErrorBody(parsed: unknown, status: number): string {
  if (!parsed || typeof parsed !== 'object') {
    return typeof parsed === 'string' && parsed.trim()
      ? parsed
      : `Request failed (${status})`;
  }
  const payload = parsed as {
    message?: string | string[];
    errors?: string[] | Record<string, unknown>;
  };
  const msgPart = Array.isArray(payload.message)
    ? payload.message.join('; ')
    : typeof payload.message === 'string'
      ? payload.message
      : '';
  const details = Array.isArray(payload.errors)
    ? payload.errors.join(', ')
    : payload.errors
      ? JSON.stringify(payload.errors)
      : '';
  return [msgPart, details].filter(Boolean).join(' - ') || `Request failed (${status})`;
}

/** Older API builds without `clientId` on SendMessageDto reject the field (forbidNonWhitelisted). */
function isClientIdRejectedByServer(message: string): boolean {
  return (
    /clientId/i.test(message) &&
    /should not exist|must not exist|not whitelisted|whitelist|forbidden property|unknown value/i.test(
      message,
    )
  );
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await ensureTokenLoaded();
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
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && token) {
      const body = parsed as { code?: string; reason?: string | null } | null;
      if (body && typeof body === 'object' && body.code === 'ACCOUNT_DISABLED') {
        // Admin blocked/disabled this account — force the user back to the
        // auth stack and hand the reason to the forced-logout screen
        // instead of showing a generic error toast on whatever screen
        // happened to make this request.
        void notifyAccountDisabled(body.reason ?? null);
      }
    }
    throw new Error(formatApiErrorBody(parsed, res.status));
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    'success' in parsed &&
    (parsed as { success: boolean }).success === true &&
    'data' in parsed
  ) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}

function apiOrigin() {
  return API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
}

function normalizeUser(user: User & { avatarUrl?: string }) {
  return {
    ...user,
    avatarUri: user.avatarUri ?? user.avatarUrl,
  };
}

function normalizeThread(thread: ChatThread): ChatThread {
  const u = parseOptionalThreadUnread(unreadFromThreadWire(thread));
  return {
    ...thread,
    updatedAt: new Date(thread.updatedAt).toISOString(),
    ...(u !== undefined ? { unreadCount: u } : {}),
  };
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    createdAt: new Date(message.createdAt).toISOString(),
  };
}

function parseMonthlyPrice(raw: string): number {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export type AuthStartResult =
  | { status: 'verified'; user: User }
  | { status: 'otp-required'; email: string; purpose: 'signup' | 'login' };

export async function mockLogin(email: string, password: string): Promise<AuthStartResult> {
  if (API_MODE !== 'live') {
    await delay(400);
    return {
      status: 'verified',
      user: {
        id: 'me',
        email,
        displayName: email.split('@')[0].replace(/[._]/g, ' ') || 'You',
      },
    };
  }
  const data = await apiRequest<{ email: string; purpose: 'signup' | 'login'; message: string }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );
  return { status: 'otp-required', email: data.email, purpose: data.purpose };
}

export async function mockRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthStartResult> {
  if (API_MODE !== 'live') {
    await delay(500);
    return {
      status: 'verified',
      user: {
        id: 'me',
        email,
        displayName: displayName.trim() || 'New member',
      },
    };
  }
  const data = await apiRequest<{ email: string; message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  return { status: 'otp-required', email: data.email, purpose: 'signup' };
}

/** Second step of both login and register above — this is what actually signs the user in. */
export async function verifyAuthOtp(
  email: string,
  code: string,
  purpose: 'signup' | 'login',
): Promise<User> {
  if (API_MODE !== 'live') {
    await delay(300);
    return { id: 'me', email, displayName: email.split('@')[0].replace(/[._]/g, ' ') || 'You' };
  }
  const data = await apiRequest<{ accessToken: string; user: User }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code, purpose }),
  });
  await setAccessToken(data.accessToken);
  return normalizeUser(data.user);
}

/** Re-sends the code — throws with a `retryAfterSeconds` field (via errorMessage's underlying error) if still within the 60s cooldown. */
export async function resendAuthOtp(
  email: string,
  purpose?: 'signup' | 'login',
): Promise<{ message: string }> {
  if (API_MODE !== 'live') {
    await delay(300);
    return { message: 'Code resent.' };
  }
  return apiRequest<{ message: string }>('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  });
}

export async function mockRequestPasswordReset(_email: string): Promise<void> {
  if (API_MODE === 'live') {
    return;
  }
  await delay(450);
}

export async function fetchProperties(
  category: PropertyCategory,
  userId?: string,
): Promise<Property[]> {
  if (API_MODE === 'live') {
    const params = new URLSearchParams();
    if (category !== 'all') {
      params.set('category', category);
    }
    const data = await apiRequest<{ items: Property[] }>(
      `/properties?${params.toString()}`,
    );
    return data.items;
  }
  await delay(300);
  const mine = userId
    ? useMyListingsStore
        .getState()
        .listings.filter(
          l => l.ownerId === userId && l.status === 'live',
        )
    : [];

  const mockFiltered =
    category === 'all'
      ? MOCK_PROPERTIES
      : MOCK_PROPERTIES.filter(p => p.category === category);

  const mineFiltered =
    category === 'all'
      ? mine
      : mine.filter(p => p.category === category);

  const seen = new Set<string>();
  const merged: Property[] = [];
  for (const p of [...mineFiltered, ...mockFiltered]) {
    if (seen.has(p.id)) {
      continue;
    }
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

export async function fetchProperty(id: string): Promise<Property | null> {
  if (API_MODE === 'live') {
    return apiRequest<Property>(`/properties/${id}`);
  }
  await delay(200);
  const mock = MOCK_PROPERTIES.find(p => p.id === id);
  if (mock) {
    return mock;
  }
  return useMyListingsStore.getState().listings.find(l => l.id === id) ?? null;
}

export async function fetchThreads(user: User): Promise<ChatThread[]> {
  if (API_MODE === 'live') {
    const data = await apiRequest<{ items: ChatThread[] }>('/chats/threads');
    return data.items.map(normalizeThread);
  }
  await delay(250);
  return buildInitialThreads(user);
}

/**
 * Paginated messages (page 1 = **newest** window — matches backend ordering).
 * Use with `useInfiniteQuery` for production chat history.
 */
export async function fetchMessagesPage(
  threadId: string,
  user: User,
  page: number,
  limit: number,
): Promise<MessagesPageResult> {
  if (API_MODE !== 'live') {
    await delay(120);
    seedMessagesIfNeeded(threadId, user);
    const all = getMessages(threadId)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    const total = all.length;
    const endExclusive = total - (page - 1) * limit;
    const start = Math.max(0, endExclusive - limit);
    const items = all.slice(start, endExclusive);
    const hasNext = start > 0;
    return {
      items,
      pagination: { page, limit, total, hasNext },
    };
  }
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const data = await apiRequest<{
    items: ChatMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  }>(`/chats/threads/${threadId}/messages?${params.toString()}`);
  return {
    items: data.items.map(normalizeMessage),
    pagination: data.pagination,
  };
}

/**
 * Open or reuse a 1:1 thread with the listing host (mock layer).
 * Seeds a listing-tagged intro message from the guest when appropriate.
 * Invalidate React Query `['threads']` and `['messages', threadId, userId]` after calling.
 */
export function openDirectThreadForListing(
  lister: PropertyLister,
  property: Pick<
    Property,
    'id' | 'title' | 'imageUrl' | 'location' | 'priceMonthly'
  >,
  user: User,
): ChatThread {
  if (API_MODE === 'live') {
    return {
      id: `pending-${Date.now()}`,
      type: 'direct',
      title: lister.displayName,
      relatedListing: {
        id: property.id,
        title: property.title,
        imageUrl: property.imageUrl,
        location: property.location,
        priceMonthly: property.priceMonthly,
      },
      lastMessage: `Re: ${property.title}`,
      updatedAt: new Date().toISOString(),
      peerUserId: lister.id,
    };
  }
  const listing: ChatListingRef = {
    id: property.id,
    title: property.title,
    imageUrl: property.imageUrl,
    location: property.location,
    priceMonthly: property.priceMonthly,
  };
  const thread = ensureDirectThread(lister.id, lister.displayName, {
    listing,
  });
  ensureListingIntroMessage(thread.id, user, listing);
  return buildInitialThreads(user).find(t => t.id === thread.id) ?? thread;
}

/** Generate a fresh idempotency key for an outbound message. Callers pass the
 *  same key on retry so the server returns the original row instead of
 *  inserting a duplicate. */
export function newClientMessageId(): string {
  return uuidV4();
}

export async function sendChatMessage(
  threadId: string,
  user: User,
  body: string,
  clientId: string = newClientMessageId(),
  locationContext?: ChatMessage['locationContext'],
  imageUrl?: string,
  communityPostContext?: ChatMessage['communityPostContext'],
  replyToCommunityMessage?: ChatMessage['replyToCommunityMessage'],
): Promise<ChatMessage> {
  if (API_MODE === 'live') {
    const socket = await connectChatSocket();
    const trimmed = body.trim();

    const sendPayload: {
      threadId: string;
      body: string;
      clientId: string;
      locationContext?: ChatMessage['locationContext'];
      imageUrl?: string;
      communityPostContext?: ChatMessage['communityPostContext'];
      replyToCommunityMessage?: ChatMessage['replyToCommunityMessage'];
    } = { threadId, body: trimmed, clientId };

    const restPayload: {
      body: string;
      clientId?: string;
      locationContext?: ChatMessage['locationContext'];
      imageUrl?: string;
      communityPostContext?: ChatMessage['communityPostContext'];
      replyToCommunityMessage?: ChatMessage['replyToCommunityMessage'];
    } = { body: trimmed, clientId };

    if (locationContext) {
      sendPayload.locationContext = locationContext;
      restPayload.locationContext = locationContext;
    }
    if (imageUrl) {
  sendPayload.imageUrl = imageUrl;
  restPayload.imageUrl = imageUrl;
}
if (communityPostContext) {
 
  sendPayload.communityPostContext = communityPostContext;
restPayload.communityPostContext = communityPostContext;
}
if (replyToCommunityMessage) {
  sendPayload.replyToCommunityMessage = replyToCommunityMessage;
  restPayload.replyToCommunityMessage = replyToCommunityMessage;
}

    if (socket && socket.connected) {
      await joinChatThreadSocket(threadId);
      const data = await new Promise<ChatMessage>((resolve, reject) => {
        socket
          .timeout(10_000)
          .emit(
            'message:send',
            sendPayload,
            (err: unknown, response: ChatMessage | { message?: string }) => {
              if (err) {
                reject(new Error('Message send timed out'));
                return;
              }
              if (
                response &&
                typeof response === 'object' &&
                'message' in response &&
                typeof response.message === 'string'
              ) {
                reject(new Error(response.message));
                return;
              }
              resolve(response as ChatMessage);
            },
          );
      });
      return normalizeMessage(data);
    }
    let data: ChatMessage;
    try {
      data = await apiRequest<ChatMessage>(
        `/chats/threads/${threadId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(restPayload),
        },
      );
    } catch (err) {
      const msg = errorMessage(err, '');
      if (isClientIdRejectedByServer(msg)) {
        logger.debug(
          'POST /messages retried without clientId (deploy latest backend SendMessageDto for idempotency).',
        );

        const retryPayload: {
  body: string;
  locationContext?: ChatMessage['locationContext'];
  imageUrl?: string;
  communityPostContext?: ChatMessage['communityPostContext'];
  replyToCommunityMessage?: ChatMessage['replyToCommunityMessage'];
} = {
   body: restPayload.body 
  };

if (restPayload.locationContext) {
  retryPayload.locationContext = restPayload.locationContext;
}

if (imageUrl) {
  retryPayload.imageUrl = imageUrl;
}
if (communityPostContext) {
  retryPayload.communityPostContext = communityPostContext;
}
if (replyToCommunityMessage) {
  retryPayload.replyToCommunityMessage = replyToCommunityMessage;
}
        data = await apiRequest<ChatMessage>(
          `/chats/threads/${threadId}/messages`,
          {
            method: 'POST',
            body: JSON.stringify(retryPayload),
          },
        );
      } else {
        throw err;
      }
    }
    return normalizeMessage(data);
  }
  await delay(150);
  const msg: ChatMessage = {
    id: `m-${Date.now()}`,
    threadId,
    authorId: user.id,
    authorName: user.displayName,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    clientId,
    ...(locationContext ? { locationContext } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(communityPostContext ? { communityPostContext } : {}),
    ...(replyToCommunityMessage ? { replyToCommunityMessage } : {}),
  };
  appendMessage(threadId, msg);
  return msg;
}

/**
 * Tell the server we've read the latest messages in `threadId`. Server resets
 * unread to 0 and broadcasts `message:read` to peers so they can render
 * "read" indicators. Fire-and-forget: failures are non-fatal.
 */
export async function markThreadRead(threadId: string): Promise<void> {
  if (API_MODE !== 'live') {
    return;
  }
  const socket = await connectChatSocket();
  if (!socket || !socket.connected) {
    return;
  }
  socket.emit('message:read', { threadId });
}

/**
 * "Clear all messages" — hides this thread's history from the current
 * user's view only. The other participant's history is untouched.
 */
export async function clearThreadMessages(threadId: string): Promise<void> {
  if (API_MODE !== 'live') {
    return;
  }
  await apiRequest(`/chats/threads/${threadId}/clear`, { method: 'POST' });
}

/**
 * Delete a message. `scope: 'me'` hides it from the requester only;
 * `scope: 'everyone'` (author-only, server-enforced) blanks it for both
 * sides and broadcasts `message:deleted` over the socket.
 */
export async function deleteMessage(
  messageId: string,
  scope: 'me' | 'everyone',
): Promise<void> {
  if (API_MODE !== 'live') {
    return;
  }
  await apiRequest(`/chats/messages/${messageId}?scope=${scope}`, {
    method: 'DELETE',
  });
}

/** Stop receiving real-time events for `threadId` (frees the room on the
 *  server and prevents `joinedThreads` from growing unbounded across screens). */
export async function leaveChatThreadSocket(threadId: string): Promise<void> {
  chat.joinedThreads.delete(threadId);
  const tracked = chat.socket;
  if (tracked?.id != null && tracked.id !== '') {
    chat.threadJoinEmittedForSocket.delete(`${tracked.id}:${threadId}`);
  }
  if (API_MODE !== 'live') {
    return;
  }
  const socket = chat.socket;
  if (socket?.connected) {
    socket.emit('thread:leave', { threadId });
  }
}

export async function createOrOpenDirectThread(
  title: string,
  peerUserId: string,
  relatedListing?: ChatListingRef,
) {
  if (API_MODE !== 'live') {
    return ensureDirectThread(
      peerUserId,
      title,
      relatedListing ? { listing: relatedListing } : undefined,
    );
  }
  const data = await apiRequest<ChatThread>('/chats/threads', {
    method: 'POST',
    body: JSON.stringify({
      type: 'direct',
      title,
      peerUserId,
      // Real Property listings still use relatedPropertyId elsewhere
      // (openDirectThreadForListing). This path is for community ads,
      // which aren't Property rows, so we send a snapshot copy instead —
      // matches ChatThreadEntity.relatedListingSnapshot on the backend.
      relatedListingSnapshot: relatedListing,
    }),
  });
  return normalizeThread(data);
}

export async function fetchMyListings(): Promise<ManagedListing[]> {
  if (API_MODE !== 'live') {
    return useMyListingsStore.getState().listings;
  }
  return apiRequest<ManagedListing[]>('/properties/me/listings');
}

export async function updateMyListingStatus(
  listingId: string,
  status: 'live' | 'paused',
) {
  if (API_MODE !== 'live') {
    useMyListingsStore.getState().setStatus(listingId, status);
    return;
  }
  await apiRequest(`/properties/${listingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function removeMyListing(listingId: string) {
  if (API_MODE !== 'live') {
    useMyListingsStore.getState().remove(listingId);
    return;
  }
  await apiRequest(`/properties/${listingId}`, { method: 'DELETE' });
}

export async function publishListing(
  form: ListingFormValues,
  ownerId: string,
  ownerDisplayName: string,
) {
  if (API_MODE !== 'live') {
    useMyListingsStore.getState().addFromDraft(form, ownerId, ownerDisplayName);
    return;
  }
  const features: string[] = [];
  const bedrooms = form.bedrooms.trim();
  const bathrooms = form.bathrooms.trim();
  const sqft = form.sqft.trim();
  if (bedrooms) {
    features.push(`${bedrooms} beds`);
  }
  if (bathrooms) {
    features.push(`${bathrooms} baths`);
  }
  if (sqft) {
    features.push(`${sqft} sqft`);
  }
  form.amenities.forEach(amenity => features.push(amenity));

  const imageUrls = form.photoUris.filter(uri => uri.trim().length > 0);
  const fallbackImage = 'https://picsum.photos/1200/800';
  await apiRequest('/properties', {
    method: 'POST',
    body: JSON.stringify({
      title: form.title.trim(),
      location: form.address.trim(),
      priceMonthly: parseMonthlyPrice(form.price),
      category: form.category,
      description: form.description.trim() || undefined,
      isPremium: false,
      features,
      imageUrls: imageUrls.length > 0 ? imageUrls : [fallbackImage],
    }),
  });
}

export async function updateProfile(updates: {
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  estateName?: string;
}) {
  if (API_MODE !== 'live') {
    return;
  }
  await apiRequest<User>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Public profile of another user (e.g. the peer in a direct chat thread).
 * Used by the "tap a chat peer's name" screen — never exposes sensitive
 * fields beyond what `GET /users/:id` returns.
 */
export async function fetchUserProfile(userId: string): Promise<PublicUserProfile> {
  if (API_MODE !== 'live') {
    return {
      id: userId,
      displayName: 'User',
      email: '',
    };
  }
  return apiRequest<PublicUserProfile>(`/users/${userId}`);
}

// ---- Moderation: block + report --------------------------------------

export type ReportReason = 'spam' | 'suspicious_activity' | 'other';

export async function blockUser(userId: string) {
  return apiRequest(`/users/me/blocks`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function unblockUser(userId: string) {
  return apiRequest(`/users/me/blocks/${userId}`, { method: 'DELETE' });
}

export async function fetchBlockedUsers(): Promise<{
  items: { id: string; displayName: string; avatarUrl?: string | null }[];
}> {
  return apiRequest(`/users/me/blocks`);
}

export async function submitReport(params: {
  targetType: 'user' | 'message' | 'listing';
  targetId: string;
  reason: ReportReason;
  details?: string;
}) {
  return apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  if (API_MODE !== 'live') {
    return;
  }
  await apiRequest('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * Permanently deletes the current user's account and all associated data
 * (messages, threads, listings, etc. — server-side cascade). Irreversible.
 * Caller is responsible for signing the user out locally afterwards
 * (`useAuthStore.setUser(null)`), same as any other account-ending action.
 */
export async function deleteAccount() {
  if (API_MODE !== 'live') {
    return;
  }
  await apiRequest('/users/me', { method: 'DELETE' });
}

/**
 * "Delete chat" — removes a thread from the current user's own inbox list
 * only. The other participant(s) and the thread's messages are untouched;
 * the thread reappears for this user automatically if someone sends a new
 * message into it.
 */
export async function deleteChatThread(threadId: string) {
  if (API_MODE !== 'live') {
    return;
  }
  await apiRequest(`/chats/threads/${threadId}`, { method: 'DELETE' });
}

/** Throttle noisy reconnect logs (same failure spamming every retry). */
let lastChatSocketErrorLogAt = 0;

function attachSocketListeners(socket: Socket) {
  socket.io.on('reconnect_attempt', () => {
    void ensureTokenLoaded().then(token => {
      if (token) {
        socket.auth = { token };
      }
    });
  });
  socket.on('connect', () => {
    chat.subs.connect.forEach(fn => {
      try {
        fn();
      } catch (err) {
        logger.warn('socket connect handler threw', err);
      }
    });
    // Server drops room membership on reconnect — rejoin tracked threads exactly once each.
    const sid = socket.id ?? '';
    chat.threadJoinEmittedForSocket.clear();
    for (const tid of chat.joinedThreads) {
      const joinKey = `${sid}:${tid}`;
      chat.threadJoinEmittedForSocket.add(joinKey);
      socket.emit('thread:join', { threadId: tid });
    }
    if (chat.watchedDisplayPosts.size > 0) {
      socket.emit('display:join', { postIds: [...chat.watchedDisplayPosts] });
    }
    // Distinguish first-connect from a reconnect-after-disconnect so
    // subscribers can refetch missed state only when they actually need to.
    if (chat.hasEverConnected) {
      chat.subs.reconnect.forEach(fn => {
        try {
          fn();
        } catch (err) {
          logger.warn('reconnect handler threw', err);
        }
      });
    }
    chat.hasEverConnected = true;
  });
  socket.on('connect_error', err => {
    const detail =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
    const origin = apiOrigin();
    const now = Date.now();
    if (now - lastChatSocketErrorLogAt > 8000) {
      logger.warn(
        'Chat socket connect_error:',
        detail,
        '| URL:',
        `${origin}/chat`,
        '| Tip: use LAN IP in API_BASE_URL on device (not localhost); HTTP dev needs cleartext on Android.',
      );
      lastChatSocketErrorLogAt = now;
    } else {
      logger.debug('Chat socket connect_error', detail);
    }
  });
  socket.on('disconnect', reason => {
    logger.info('Chat socket disconnect', reason);
    chat.threadJoinEmittedForSocket.clear();
  });
  socket.on('message:new', payload => {
    const message = normalizeMessage(payload as ChatMessage);
    chat.subs.message.forEach(fn => fn(message));
  });
  socket.on('typing:update', (payload: TypingPayload) => {
    chat.subs.typing.forEach(fn => fn(payload));
  });
  socket.on('thread:update', payload => {
    const thread = normalizeThread(payload as ChatThread);
    chat.subs.thread.forEach(fn => fn(thread));
  });
  socket.on('presence:update', (payload: PresencePayload) => {
    chat.presence.set(payload.userId, {
      isOnline: payload.isOnline,
      lastSeenAt: payload.lastSeenAt,
    });
    chat.subs.presence.forEach(fn => fn(payload));
  });
  socket.on('message:read', (payload: MessageReadPayload) => {
    chat.subs.read.forEach(fn => fn(payload));
  });
  socket.on('message:deleted', (payload: MessageDeletedPayload) => {
    chat.subs.deleted.forEach(fn => fn(payload));
  });
  socket.on('display:views', (payload: DisplayViewsPayload) => {
    chat.subs.displayViews.forEach(fn => fn(payload));
  });
}

export async function connectChatSocket(): Promise<Socket | null> {
  if (API_MODE !== 'live') {
    return null;
  }
  if (chat.socket?.connected) {
    return chat.socket;
  }
  if (chat.connecting) {
    return chat.connecting;
  }
  chat.connecting = (async () => {
    const token = await ensureTokenLoaded();
    if (!token) {
      return null;
    }
    // If a previous (disconnected) socket is still around, drop it before creating a new one.
    if (chat.socket) {
      chat.socket.removeAllListeners();
      chat.socket.disconnect();
      chat.socket = null;
    }
    const socket = io(`${apiOrigin()}/chat`, {
      // Explicit path keeps proxies (nginx, Cloudflare) and non-root mounts predictable.
      path: '/socket.io/',
      // Polling first fixes many Android/emulator cases where raw WebSocket
      // fails while Engine.IO long-polling works (same host as REST).
      transports: ['polling', 'websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      randomizationFactor: 0.5,
      timeout: 15_000,
    });
    attachSocketListeners(socket);
    chat.socket = socket;
    return socket;
  })();
  try {
    return await chat.connecting;
  } finally {
    chat.connecting = null;
  }
}

/**
 * Tear down the chat socket and reset session-scoped state (token, joined
 * rooms, presence cache). Must be called on logout so the next login
 * authenticates with a fresh token.
 *
 * Intentionally does **not** clear `chat.subs.*`: each subscriber owns its
 * own lifecycle via the unsubscribe function returned from `onXxx(...)`.
 * Clearing subs here would silently orphan handlers that survive the
 * user-id change (e.g. AppProviders' `subscribeChatRealtimeSync`, which
 * re-runs across login transitions and re-registers fresh handlers).
 */
export async function disconnectChatSocket() {
  useActiveChatThreadStore.getState().setActiveThreadId(null);
  const socket = chat.socket;
  chat.socket = null;
  chat.connecting = null;
  chat.joinedThreads.clear();
  chat.watchedDisplayPosts.clear();
  chat.threadJoinEmittedForSocket.clear();
  chat.presence.clear();
  chat.hasEverConnected = false;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
}

export async function getChatSocket() {
  return connectChatSocket();
}

export async function joinChatThreadSocket(threadId: string) {
  chat.joinedThreads.add(threadId);
  const socket = await connectChatSocket();
  if (!socket?.connected || socket.id === undefined || socket.id === '') {
    // `connect` handler will replay joins with dedupe bookkeeping.
    return;
  }
  const joinKey = `${socket.id}:${threadId}`;
  if (chat.threadJoinEmittedForSocket.has(joinKey)) {
    return;
  }
  chat.threadJoinEmittedForSocket.add(joinKey);
  socket.emit('thread:join', { threadId });
}

/** Start receiving live visitor-count updates for these Display posts. */
export async function watchDisplayPosts(postIds: string[]) {
  const fresh = postIds.filter(id => id && !chat.watchedDisplayPosts.has(id));
  if (fresh.length === 0) {
    return;
  }
  fresh.forEach(id => chat.watchedDisplayPosts.add(id));
  const socket = await connectChatSocket();
  if (socket?.connected) {
    socket.emit('display:join', { postIds: fresh });
  }
  // If not connected yet, the `connect` handler replays the whole set.
}

export async function unwatchDisplayPosts(postIds: string[]) {
  const present = postIds.filter(id => chat.watchedDisplayPosts.has(id));
  if (present.length === 0) {
    return;
  }
  present.forEach(id => chat.watchedDisplayPosts.delete(id));
  const socket = chat.socket;
  if (socket?.connected) {
    socket.emit('display:leave', { postIds: present });
  }
}

export function onDisplayViewsUpdate(handler: (p: DisplayViewsPayload) => void) {
  chat.subs.displayViews.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.displayViews.delete(handler);
  };
}

export async function emitTypingStart(threadId: string) {
  const socket = await connectChatSocket();
  socket?.emit('typing:start', { threadId });
}

export async function emitTypingStop(threadId: string) {
  const socket = await connectChatSocket();
  socket?.emit('typing:stop', { threadId });
}

export function onIncomingChatMessage(handler: (message: ChatMessage) => void) {
  chat.subs.message.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.message.delete(handler);
  };
}

export function onTypingUpdate(handler: (payload: TypingPayload) => void) {
  chat.subs.typing.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.typing.delete(handler);
  };
}

export function onThreadUpdate(handler: (payload: ChatThread) => void) {
  chat.subs.thread.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.thread.delete(handler);
  };
}

export function onPresenceUpdate(handler: (payload: PresencePayload) => void) {
  chat.subs.presence.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.presence.delete(handler);
  };
}

/** Fires whenever a peer marks `threadId` read up to `readAt`. Use to render
 *  read indicators on the sender's own messages. */
export function onMessageRead(handler: (payload: MessageReadPayload) => void) {
  chat.subs.read.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.read.delete(handler);
  };
}

/** Fires when a message is deleted "for everyone" — swap that message's
 *  bubble to the "message deleted" placeholder live, no refetch needed. */
export function onMessageDeleted(handler: (payload: MessageDeletedPayload) => void) {
  chat.subs.deleted.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.deleted.delete(handler);
  };
}

/** Fires after a *re*connect (not the initial connect). Subscribers should
 *  refetch any state that may have drifted while the socket was offline —
 *  threads list, current thread's messages, etc. */
export function onSocketReconnect(handler: () => void) {
  chat.subs.reconnect.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.reconnect.delete(handler);
  };
}

/** Fires on every successful socket connect (first session connect included). */
export function onSocketConnect(handler: () => void) {
  chat.subs.connect.add(handler);
  void connectChatSocket();
  return () => {
    chat.subs.connect.delete(handler);
  };
}

export function getPresenceState(userId: string) {
  return chat.presence.get(userId) ?? { isOnline: false, lastSeenAt: null };
}

export async function clearSessionToken() {
  await disconnectChatSocket();
  await setAccessToken(null);
}













//comment data 1


// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { io, Socket } from 'socket.io-client';
// import { useActiveChatThreadStore } from '../stores/activeChatThreadStore';
// import { API_BASE_URL, API_MODE } from '../config/appConfig';
// import { logger } from '../lib/logger';
// import { uuidV4 } from '../lib/uuid';
// import type { MessagesPageResult } from '../chat/messagePages';
// import { parseOptionalThreadUnread, unreadFromThreadWire } from '../chat/threadUnread';
// import type {
//   ChatMessage,
//   ChatThread,
//   ChatListingRef,
//   ManagedListing,
//   Property,
//   PropertyCategory,
//   PropertyLister,
//   User,
// } from '../types/models';
// import type { ListingFormValues } from '../types/listingForm';
// import { useMyListingsStore } from '../stores/myListingsStore';
// import {
//   appendMessage,
//   buildInitialThreads,
//   ensureDirectThread,
//   ensureListingIntroMessage,
//   getMessages,
//   MOCK_PROPERTIES,
//   seedMessagesIfNeeded,
// } from './mockData';


// // adds code 1 start
// export type CommunityPost = {
//   id: string;
//   userId: string;
//   title: string;
//   description: string;
//   city: string;
//   images: string[];
//   createdAt: string;
//   updatedAt: string;

//   // Returned by GET /community/posts
//   authorName?: string;
//   authorAvatarUrl?: string | null;
// };


// export async function createDirectChatFromCommunityAd(
//   ownerId: string,
//   listing: ChatListingRef,
// ): Promise<ChatThread> {
//   if (API_MODE !== 'live') {
//     return ensureDirectThread(ownerId, listing.title, {
//       listing,
//     });
//   }

//   const data = await apiRequest<ChatThread>('/chat/direct', {
//     method: 'POST',
//     body: JSON.stringify({
//       peerUserId: ownerId,
//       relatedListing: listing,
//     }),
//   });

//   return normalizeThread(data);
// }

// export function communityPostToChatListing(
//   post: CommunityPost,
// ): ChatListingRef {
//   return {
//     id: post.id,
//     title: post.title,
//     imageUrl: post.images?.[0] ?? '',
//     location: post.city,
//     priceMonthly: 0,
//   };
// }


// export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
//   return apiRequest<CommunityPost[]>('/community/posts');
// }


// export async function createCommunityPost(data: {
//   title: string;
//   description: string;
//   city: string;
//   images: string[];
// }): Promise<{
//   id: string;
//   userId: string;
//   title: string;
//   description: string;
//   city: string;
//   images: string[];
//   createdAt: string;
//   updatedAt: string;
// }> {
//   return apiRequest('/community/posts', {
//     method: 'POST',
//     body: JSON.stringify(data),
//   });
// }
// //  adds code 1 end



// const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
// const TOKEN_STORAGE_KEY = 'brokage.api.token.v1';
// let accessToken: string | null = null;

// type TypingPayload = {
//   threadId: string;
//   userId: string;
//   userName: string;
//   isTyping: boolean;
// };
// type PresencePayload = {
//   userId: string;
//   userName: string;
//   isOnline: boolean;
//   lastSeenAt?: string | null;
// };
// export type MessageReadPayload = {
//   threadId: string;
//   userId: string;
//   readAt: string;
// };

// /**
//  * Single owner of the chat socket lifecycle. Subscribers register against this
//  * registry (not the underlying Socket instance) so they survive reconnects and
//  * user changes. `connectChatSocket()` is the only place an `io(...)` is created.
//  */
// const chat = {
//   socket: null as Socket | null,
//   /** Coalesces parallel `connectChatSocket()` calls into one `io(...)` instance. */
//   connecting: null as Promise<Socket | null> | null,
//   /** Threads the user has opened — re-emitted as `thread:join` after each reconnect. */
//   joinedThreads: new Set<string>(),
//   /**
//    * Tracks `socket.id + threadId` pairs that already emitted `thread:join` on this connection.
//    * Without this every `send()` would re-emit join → redundant mark-read + `thread:update` bursts
//    * that reorder against `message:send` and make unread badges oscillate ("1 then hide").
//    */
//   threadJoinEmittedForSocket: new Set<string>(),
//   /** Becomes true after the first successful connect; lets `reconnect` subscribers
//    *  distinguish initial connects from reconnects (so they only refetch on the latter). */
//   hasEverConnected: false,
//   presence: new Map<string, { isOnline: boolean; lastSeenAt?: string | null }>(),
//   subs: {
//     message: new Set<(m: ChatMessage) => void>(),
//     typing: new Set<(p: TypingPayload) => void>(),
//     thread: new Set<(t: ChatThread) => void>(),
//     presence: new Set<(p: PresencePayload) => void>(),
//     read: new Set<(p: MessageReadPayload) => void>(),
//     /** Every successful socket connect (including first login connect). */
//     connect: new Set<() => void>(),
//     reconnect: new Set<() => void>(),
//   },
// };

// if (API_MODE === 'live') {
//   logger.info('Using live API mode');
// }

// export function errorMessage(error: unknown, fallback = 'Something went wrong') {
//   if (error instanceof Error && error.message.trim()) {
//     return error.message;
//   }
//   if (typeof error === 'string' && error.trim()) {
//     return error;
//   }
//   return fallback;
// }

// async function ensureTokenLoaded() {
//   if (accessToken !== null) {
//     return accessToken;
//   }
//   const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
//   accessToken = stored;
//   return accessToken;
// }

// async function setAccessToken(token: string | null) {
//   accessToken = token;
//   if (token) {
//     await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
//   } else {
//     await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
//   }
// }

// /** Flatten Nest/class-validator error payloads for logging and matching. */
// function formatApiErrorBody(parsed: unknown, status: number): string {
//   if (!parsed || typeof parsed !== 'object') {
//     return typeof parsed === 'string' && parsed.trim()
//       ? parsed
//       : `Request failed (${status})`;
//   }
//   const payload = parsed as {
//     message?: string | string[];
//     errors?: string[] | Record<string, unknown>;
//   };
//   const msgPart = Array.isArray(payload.message)
//     ? payload.message.join('; ')
//     : typeof payload.message === 'string'
//       ? payload.message
//       : '';
//   const details = Array.isArray(payload.errors)
//     ? payload.errors.join(', ')
//     : payload.errors
//       ? JSON.stringify(payload.errors)
//       : '';
//   return [msgPart, details].filter(Boolean).join(' - ') || `Request failed (${status})`;
// }

// /** Older API builds without `clientId` on SendMessageDto reject the field (forbidNonWhitelisted). */
// function isClientIdRejectedByServer(message: string): boolean {
//   return (
//     /clientId/i.test(message) &&
//     /should not exist|must not exist|not whitelisted|whitelist|forbidden property|unknown value/i.test(
//       message,
//     )
//   );
// }

// async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
//   const token = await ensureTokenLoaded();
//   const headers: Record<string, string> = {
//     'Content-Type': 'application/json',
//     ...(init?.headers as Record<string, string>),
//   };
//   if (token) {
//     headers.Authorization = `Bearer ${token}`;
//   }
//   const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
//   const text = await res.text();
//   let parsed: unknown = null;
//   if (text) {
//     try {
//       parsed = JSON.parse(text) as unknown;
//     } catch {
//       parsed = text;
//     }
//   }
//   if (!res.ok) {
//     throw new Error(formatApiErrorBody(parsed, res.status));
//   }
//   if (
//     parsed &&
//     typeof parsed === 'object' &&
//     'success' in parsed &&
//     (parsed as { success: boolean }).success === true &&
//     'data' in parsed
//   ) {
//     return (parsed as { data: T }).data;
//   }
//   return parsed as T;
// }

// function apiOrigin() {
//   return API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
// }

// function normalizeUser(user: User & { avatarUrl?: string }) {
//   return {
//     ...user,
//     avatarUri: user.avatarUri ?? user.avatarUrl,
//   };
// }

// function normalizeThread(thread: ChatThread): ChatThread {
//   const u = parseOptionalThreadUnread(unreadFromThreadWire(thread));
//   return {
//     ...thread,
//     updatedAt: new Date(thread.updatedAt).toISOString(),
//     ...(u !== undefined ? { unreadCount: u } : {}),
//   };
// }

// function normalizeMessage(message: ChatMessage): ChatMessage {
//   return {
//     ...message,
//     createdAt: new Date(message.createdAt).toISOString(),
//   };
// }

// function parseMonthlyPrice(raw: string): number {
//   const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
//   return Number.isFinite(n) ? Math.round(n) : 0;
// }

// export async function mockLogin(email: string, password: string): Promise<User> {
//   if (API_MODE !== 'live') {
//     await delay(400);
//     return {
//       id: 'me',
//       email,
//       displayName: email.split('@')[0].replace(/[._]/g, ' ') || 'You',
//     };
//   }
//   const data = await apiRequest<{ accessToken: string; user: User }>('/auth/login', {
//     method: 'POST',
//     body: JSON.stringify({ email, password }),
//   });
//   await setAccessToken(data.accessToken);
//   return normalizeUser(data.user);
// }

// export async function mockRegister(
//   email: string,
//   password: string,
//   displayName: string,
// ): Promise<User> {
//   if (API_MODE !== 'live') {
//     await delay(500);
//     return {
//       id: 'me',
//       email,
//       displayName: displayName.trim() || 'New member',
//     };
//   }
//   const data = await apiRequest<{ accessToken: string; user: User }>('/auth/register', {
//     method: 'POST',
//     body: JSON.stringify({ email, password, displayName }),
//   });
//   await setAccessToken(data.accessToken);
//   return normalizeUser(data.user);
// }

// export async function mockRequestPasswordReset(_email: string): Promise<void> {
//   if (API_MODE === 'live') {
//     return;
//   }
//   await delay(450);
// }

// export async function fetchProperties(
//   category: PropertyCategory,
//   userId?: string,
// ): Promise<Property[]> {
//   if (API_MODE === 'live') {
//     const params = new URLSearchParams();
//     if (category !== 'all') {
//       params.set('category', category);
//     }
//     const data = await apiRequest<{ items: Property[] }>(
//       `/properties?${params.toString()}`,
//     );
//     return data.items;
//   }
//   await delay(300);
//   const mine = userId
//     ? useMyListingsStore
//         .getState()
//         .listings.filter(
//           l => l.ownerId === userId && l.status === 'live',
//         )
//     : [];

//   const mockFiltered =
//     category === 'all'
//       ? MOCK_PROPERTIES
//       : MOCK_PROPERTIES.filter(p => p.category === category);

//   const mineFiltered =
//     category === 'all'
//       ? mine
//       : mine.filter(p => p.category === category);

//   const seen = new Set<string>();
//   const merged: Property[] = [];
//   for (const p of [...mineFiltered, ...mockFiltered]) {
//     if (seen.has(p.id)) {
//       continue;
//     }
//     seen.add(p.id);
//     merged.push(p);
//   }
//   return merged;
// }

// export async function fetchProperty(id: string): Promise<Property | null> {
//   if (API_MODE === 'live') {
//     return apiRequest<Property>(`/properties/${id}`);
//   }
//   await delay(200);
//   const mock = MOCK_PROPERTIES.find(p => p.id === id);
//   if (mock) {
//     return mock;
//   }
//   return useMyListingsStore.getState().listings.find(l => l.id === id) ?? null;
// }

// export async function fetchThreads(user: User): Promise<ChatThread[]> {
//   if (API_MODE === 'live') {
//     const data = await apiRequest<{ items: ChatThread[] }>('/chats/threads');
//     return data.items.map(normalizeThread);
//   }
//   await delay(250);
//   return buildInitialThreads(user);
// }

// /**
//  * Paginated messages (page 1 = **newest** window — matches backend ordering).
//  * Use with `useInfiniteQuery` for production chat history.
//  */
// export async function fetchMessagesPage(
//   threadId: string,
//   user: User,
//   page: number,
//   limit: number,
// ): Promise<MessagesPageResult> {
//   if (API_MODE !== 'live') {
//     await delay(120);
//     seedMessagesIfNeeded(threadId, user);
//     const all = getMessages(threadId)
//       .slice()
//       .sort(
//         (a, b) =>
//           new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
//       );
//     const total = all.length;
//     const endExclusive = total - (page - 1) * limit;
//     const start = Math.max(0, endExclusive - limit);
//     const items = all.slice(start, endExclusive);
//     const hasNext = start > 0;
//     return {
//       items,
//       pagination: { page, limit, total, hasNext },
//     };
//   }
//   const params = new URLSearchParams({
//     page: String(page),
//     limit: String(limit),
//   });
//   const data = await apiRequest<{
//     items: ChatMessage[];
//     pagination: {
//       page: number;
//       limit: number;
//       total: number;
//       hasNext: boolean;
//     };
//   }>(`/chats/threads/${threadId}/messages?${params.toString()}`);
//   return {
//     items: data.items.map(normalizeMessage),
//     pagination: data.pagination,
//   };
// }

// /**
//  * Open or reuse a 1:1 thread with the listing host (mock layer).
//  * Seeds a listing-tagged intro message from the guest when appropriate.
//  * Invalidate React Query `['threads']` and `['messages', threadId, userId]` after calling.
//  */
// export function openDirectThreadForListing(
//   lister: PropertyLister,
//   property: Pick<
//     Property,
//     'id' | 'title' | 'imageUrl' | 'location' | 'priceMonthly'
//   >,
//   user: User,
// ): ChatThread {
//   if (API_MODE === 'live') {
//     return {
//       id: `pending-${Date.now()}`,
//       type: 'direct',
//       title: lister.displayName,
//       relatedListing: {
//         id: property.id,
//         title: property.title,
//         imageUrl: property.imageUrl,
//         location: property.location,
//         priceMonthly: property.priceMonthly,
//       },
//       lastMessage: `Re: ${property.title}`,
//       updatedAt: new Date().toISOString(),
//       peerUserId: lister.id,
//     };
//   }
//   const listing: ChatListingRef = {
//     id: property.id,
//     title: property.title,
//     imageUrl: property.imageUrl,
//     location: property.location,
//     priceMonthly: property.priceMonthly,
//   };
//   const thread = ensureDirectThread(lister.id, lister.displayName, {
//     listing,
//   });
//   ensureListingIntroMessage(thread.id, user, listing);
//   return buildInitialThreads(user).find(t => t.id === thread.id) ?? thread;
// }

// /** Generate a fresh idempotency key for an outbound message. Callers pass the
//  *  same key on retry so the server returns the original row instead of
//  *  inserting a duplicate. */
// export function newClientMessageId(): string {
//   return uuidV4();
// }

// export async function sendChatMessage(
//   threadId: string,
//   user: User,
//   body: string,
//   clientId: string = newClientMessageId(),
//   locationContext?: ChatMessage['locationContext'],
//   imageUrl?: string,
// ): Promise<ChatMessage> {
//   if (API_MODE === 'live') {
//     const socket = await connectChatSocket();
//     const trimmed = body.trim();
//     const sendPayload: {
//       threadId: string;
//       body: string;
//       clientId: string;
//       locationContext?: ChatMessage['locationContext'];
//       imageUrl?: string;
//     } = { threadId, body: trimmed, clientId };

//     const restPayload: {
//       body: string;
//       clientId?: string;
//       locationContext?: ChatMessage['locationContext'];
//       imageUrl?: string;
//     } = { body: trimmed, clientId };
//     if (locationContext) {
//       sendPayload.locationContext = locationContext;
//       restPayload.locationContext = locationContext;
//     }
//     if (imageUrl) {
//   sendPayload.imageUrl = imageUrl;
//   restPayload.imageUrl = imageUrl;
// }

//     if (socket && socket.connected) {
//       await joinChatThreadSocket(threadId);
//       const data = await new Promise<ChatMessage>((resolve, reject) => {
//         socket
//           .timeout(10_000)
//           .emit(
//             'message:send',
//             sendPayload,
//             (err: unknown, response: ChatMessage | { message?: string }) => {
//               if (err) {
//                 reject(new Error('Message send timed out'));
//                 return;
//               }
//               if (
//                 response &&
//                 typeof response === 'object' &&
//                 'message' in response &&
//                 typeof response.message === 'string'
//               ) {
//                 reject(new Error(response.message));
//                 return;
//               }
//               resolve(response as ChatMessage);
//             },
//           );
//       });
//       return normalizeMessage(data);
//     }
//     let data: ChatMessage;
//     try {
//       data = await apiRequest<ChatMessage>(
//         `/chats/threads/${threadId}/messages`,
//         {
//           method: 'POST',
//           body: JSON.stringify(restPayload),
//         },
//       );
//     } catch (err) {
//       const msg = errorMessage(err, '');
//       if (isClientIdRejectedByServer(msg)) {
//         logger.debug(
//           'POST /messages retried without clientId (deploy latest backend SendMessageDto for idempotency).',
//         );

//         const retryPayload: {
//   body: string;
//   locationContext?: ChatMessage['locationContext'];
//   imageUrl?: string;
// } = {
//    body: restPayload.body 
//   };

// if (restPayload.locationContext) {
//   retryPayload.locationContext = restPayload.locationContext;
// }

// if (imageUrl) {
//   retryPayload.imageUrl = imageUrl;
// }
//         data = await apiRequest<ChatMessage>(
//           `/chats/threads/${threadId}/messages`,
//           {
//             method: 'POST',
//             body: JSON.stringify(retryPayload),
//           },
//         );
//       } else {
//         throw err;
//       }
//     }
//     return normalizeMessage(data);
//   }
//   await delay(150);
//   const msg: ChatMessage = {
//     id: `m-${Date.now()}`,
//     threadId,
//     authorId: user.id,
//     authorName: user.displayName,
//     body: body.trim(),
//     createdAt: new Date().toISOString(),
//     clientId,
//     ...(locationContext ? { locationContext } : {}),
//     ...(imageUrl ? { imageUrl } : {}),
//   };
//   appendMessage(threadId, msg);
//   return msg;
// }

// /**
//  * Tell the server we've read the latest messages in `threadId`. Server resets
//  * unread to 0 and broadcasts `message:read` to peers so they can render
//  * "read" indicators. Fire-and-forget: failures are non-fatal.
//  */
// export async function markThreadRead(threadId: string): Promise<void> {
//   if (API_MODE !== 'live') {
//     return;
//   }
//   const socket = await connectChatSocket();
//   if (!socket || !socket.connected) {
//     return;
//   }
//   socket.emit('message:read', { threadId });
// }

// /** Stop receiving real-time events for `threadId` (frees the room on the
//  *  server and prevents `joinedThreads` from growing unbounded across screens). */
// export async function leaveChatThreadSocket(threadId: string): Promise<void> {
//   chat.joinedThreads.delete(threadId);
//   const tracked = chat.socket;
//   if (tracked?.id != null && tracked.id !== '') {
//     chat.threadJoinEmittedForSocket.delete(`${tracked.id}:${threadId}`);
//   }
//   if (API_MODE !== 'live') {
//     return;
//   }
//   const socket = chat.socket;
//   if (socket?.connected) {
//     socket.emit('thread:leave', { threadId });
//   }
// }

// export async function createOrOpenDirectThread(
//   title: string,
//   peerUserId: string,
//   relatedPropertyId?: string,
// ) {
//   if (API_MODE !== 'live') {
//     return ensureDirectThread(peerUserId, title);
//   }
//   const data = await apiRequest<ChatThread>('/chats/threads', {
//     method: 'POST',
//     body: JSON.stringify({
//       type: 'direct',
//       title,
//       peerUserId,
//       relatedPropertyId,
//     }),
//   });
//   return normalizeThread(data);
// }

// export async function fetchMyListings(): Promise<ManagedListing[]> {
//   if (API_MODE !== 'live') {
//     return useMyListingsStore.getState().listings;
//   }
//   return apiRequest<ManagedListing[]>('/properties/me/listings');
// }

// export async function updateMyListingStatus(
//   listingId: string,
//   status: 'live' | 'paused',
// ) {
//   if (API_MODE !== 'live') {
//     useMyListingsStore.getState().setStatus(listingId, status);
//     return;
//   }
//   await apiRequest(`/properties/${listingId}/status`, {
//     method: 'PATCH',
//     body: JSON.stringify({ status }),
//   });
// }

// export async function removeMyListing(listingId: string) {
//   if (API_MODE !== 'live') {
//     useMyListingsStore.getState().remove(listingId);
//     return;
//   }
//   await apiRequest(`/properties/${listingId}`, { method: 'DELETE' });
// }

// export async function publishListing(
//   form: ListingFormValues,
//   ownerId: string,
//   ownerDisplayName: string,
// ) {
//   if (API_MODE !== 'live') {
//     useMyListingsStore.getState().addFromDraft(form, ownerId, ownerDisplayName);
//     return;
//   }
//   const features: string[] = [];
//   const bedrooms = form.bedrooms.trim();
//   const bathrooms = form.bathrooms.trim();
//   const sqft = form.sqft.trim();
//   if (bedrooms) {
//     features.push(`${bedrooms} beds`);
//   }
//   if (bathrooms) {
//     features.push(`${bathrooms} baths`);
//   }
//   if (sqft) {
//     features.push(`${sqft} sqft`);
//   }
//   form.amenities.forEach(amenity => features.push(amenity));

//   const imageUrls = form.photoUris.filter(uri => uri.trim().length > 0);
//   const fallbackImage = 'https://picsum.photos/1200/800';
//   await apiRequest('/properties', {
//     method: 'POST',
//     body: JSON.stringify({
//       title: form.title.trim(),
//       location: form.address.trim(),
//       priceMonthly: parseMonthlyPrice(form.price),
//       category: form.category,
//       description: form.description.trim() || undefined,
//       isPremium: false,
//       features,
//       imageUrls: imageUrls.length > 0 ? imageUrls : [fallbackImage],
//     }),
//   });
// }

// export async function updateProfile(updates: {
//   displayName?: string;
//   avatarUrl?: string;
// }) {
//   if (API_MODE !== 'live') {
//     return;
//   }
//   await apiRequest<User>('/users/me', {
//     method: 'PATCH',
//     body: JSON.stringify(updates),
//   });
// }

// export async function changePassword(currentPassword: string, newPassword: string) {
//   if (API_MODE !== 'live') {
//     return;
//   }
//   await apiRequest('/users/me/password', {
//     method: 'PATCH',
//     body: JSON.stringify({ currentPassword, newPassword }),
//   });
// }

// /** Throttle noisy reconnect logs (same failure spamming every retry). */
// let lastChatSocketErrorLogAt = 0;

// function attachSocketListeners(socket: Socket) {
//   socket.io.on('reconnect_attempt', () => {
//     void ensureTokenLoaded().then(token => {
//       if (token) {
//         socket.auth = { token };
//       }
//     });
//   });
//   socket.on('connect', () => {
//     chat.subs.connect.forEach(fn => {
//       try {
//         fn();
//       } catch (err) {
//         logger.warn('socket connect handler threw', err);
//       }
//     });
//     // Server drops room membership on reconnect — rejoin tracked threads exactly once each.
//     const sid = socket.id ?? '';
//     chat.threadJoinEmittedForSocket.clear();
//     for (const tid of chat.joinedThreads) {
//       const joinKey = `${sid}:${tid}`;
//       chat.threadJoinEmittedForSocket.add(joinKey);
//       socket.emit('thread:join', { threadId: tid });
//     }
//     // Distinguish first-connect from a reconnect-after-disconnect so
//     // subscribers can refetch missed state only when they actually need to.
//     if (chat.hasEverConnected) {
//       chat.subs.reconnect.forEach(fn => {
//         try {
//           fn();
//         } catch (err) {
//           logger.warn('reconnect handler threw', err);
//         }
//       });
//     }
//     chat.hasEverConnected = true;
//   });
//   socket.on('connect_error', err => {
//     const detail =
//       err instanceof Error
//         ? err.message
//         : typeof err === 'object' && err !== null && 'message' in err
//           ? String((err as { message: unknown }).message)
//           : String(err);
//     const origin = apiOrigin();
//     const now = Date.now();
//     if (now - lastChatSocketErrorLogAt > 8000) {
//       logger.warn(
//         'Chat socket connect_error:',
//         detail,
//         '| URL:',
//         `${origin}/chat`,
//         '| Tip: use LAN IP in API_BASE_URL on device (not localhost); HTTP dev needs cleartext on Android.',
//       );
//       lastChatSocketErrorLogAt = now;
//     } else {
//       logger.debug('Chat socket connect_error', detail);
//     }
//   });
//   socket.on('disconnect', reason => {
//     logger.info('Chat socket disconnect', reason);
//     chat.threadJoinEmittedForSocket.clear();
//   });
//   socket.on('message:new', payload => {
//     const message = normalizeMessage(payload as ChatMessage);
//     chat.subs.message.forEach(fn => fn(message));
//   });
//   socket.on('typing:update', (payload: TypingPayload) => {
//     chat.subs.typing.forEach(fn => fn(payload));
//   });
//   socket.on('thread:update', payload => {
//     const thread = normalizeThread(payload as ChatThread);
//     chat.subs.thread.forEach(fn => fn(thread));
//   });
//   socket.on('presence:update', (payload: PresencePayload) => {
//     chat.presence.set(payload.userId, {
//       isOnline: payload.isOnline,
//       lastSeenAt: payload.lastSeenAt,
//     });
//     chat.subs.presence.forEach(fn => fn(payload));
//   });
//   socket.on('message:read', (payload: MessageReadPayload) => {
//     chat.subs.read.forEach(fn => fn(payload));
//   });
// }

// export async function connectChatSocket(): Promise<Socket | null> {
//   if (API_MODE !== 'live') {
//     return null;
//   }
//   if (chat.socket?.connected) {
//     return chat.socket;
//   }
//   if (chat.connecting) {
//     return chat.connecting;
//   }
//   chat.connecting = (async () => {
//     const token = await ensureTokenLoaded();
//     if (!token) {
//       return null;
//     }
//     // If a previous (disconnected) socket is still around, drop it before creating a new one.
//     if (chat.socket) {
//       chat.socket.removeAllListeners();
//       chat.socket.disconnect();
//       chat.socket = null;
//     }
//     const socket = io(`${apiOrigin()}/chat`, {
//       // Explicit path keeps proxies (nginx, Cloudflare) and non-root mounts predictable.
//       path: '/socket.io/',
//       // Polling first fixes many Android/emulator cases where raw WebSocket
//       // fails while Engine.IO long-polling works (same host as REST).
//       transports: ['polling', 'websocket'],
//       auth: { token },
//       reconnection: true,
//       reconnectionAttempts: Infinity,
//       reconnectionDelay: 1_000,
//       reconnectionDelayMax: 10_000,
//       randomizationFactor: 0.5,
//       timeout: 15_000,
//     });
//     attachSocketListeners(socket);
//     chat.socket = socket;
//     return socket;
//   })();
//   try {
//     return await chat.connecting;
//   } finally {
//     chat.connecting = null;
//   }
// }

// /**
//  * Tear down the chat socket and reset session-scoped state (token, joined
//  * rooms, presence cache). Must be called on logout so the next login
//  * authenticates with a fresh token.
//  *
//  * Intentionally does **not** clear `chat.subs.*`: each subscriber owns its
//  * own lifecycle via the unsubscribe function returned from `onXxx(...)`.
//  * Clearing subs here would silently orphan handlers that survive the
//  * user-id change (e.g. AppProviders' `subscribeChatRealtimeSync`, which
//  * re-runs across login transitions and re-registers fresh handlers).
//  */
// export async function disconnectChatSocket() {
//   useActiveChatThreadStore.getState().setActiveThreadId(null);
//   const socket = chat.socket;
//   chat.socket = null;
//   chat.connecting = null;
//   chat.joinedThreads.clear();
//   chat.threadJoinEmittedForSocket.clear();
//   chat.presence.clear();
//   chat.hasEverConnected = false;
//   if (socket) {
//     socket.removeAllListeners();
//     socket.disconnect();
//   }
// }

// export async function getChatSocket() {
//   return connectChatSocket();
// }

// export async function joinChatThreadSocket(threadId: string) {
//   chat.joinedThreads.add(threadId);
//   const socket = await connectChatSocket();
//   if (!socket?.connected || socket.id === undefined || socket.id === '') {
//     // `connect` handler will replay joins with dedupe bookkeeping.
//     return;
//   }
//   const joinKey = `${socket.id}:${threadId}`;
//   if (chat.threadJoinEmittedForSocket.has(joinKey)) {
//     return;
//   }
//   chat.threadJoinEmittedForSocket.add(joinKey);
//   socket.emit('thread:join', { threadId });
// }

// export async function emitTypingStart(threadId: string) {
//   const socket = await connectChatSocket();
//   socket?.emit('typing:start', { threadId });
// }

// export async function emitTypingStop(threadId: string) {
//   const socket = await connectChatSocket();
//   socket?.emit('typing:stop', { threadId });
// }

// export function onIncomingChatMessage(handler: (message: ChatMessage) => void) {
//   chat.subs.message.add(handler);
//   void connectChatSocket();
//   return () => {
//     chat.subs.message.delete(handler);
//   };
// }

// export function onTypingUpdate(handler: (payload: TypingPayload) => void) {
//   chat.subs.typing.add(handler);
//   void connectChatSocket();
//   return () => {
//     chat.subs.typing.delete(handler);
//   };
// }

// export function onThreadUpdate(handler: (payload: ChatThread) => void) {
//   chat.subs.thread.add(handler);
//   void connectChatSocket();
//   return () => {
//     chat.subs.thread.delete(handler);
//   };
// }

// export function onPresenceUpdate(handler: (payload: PresencePayload) => void) {
//   chat.subs.presence.add(handler);
//   void connectChatSocket();
//   return () => {
//     chat.subs.presence.delete(handler);
//   };
// }

// /** Fires whenever a peer marks `threadId` read up to `readAt`. Use to render
//  *  read indicators on the sender's own messages. */
// export function onMessageRead(handler: (payload: MessageReadPayload) => void) {
//   chat.subs.read.add(handler);
//   void connectChatSocket();
//   return () => {
//     chat.subs.read.delete(handler);
//   };
// }

// /** Fires after a *re*connect (not the initial connect). Subscribers should
//  *  refetch any state that may have drifted while the socket was offline —
//  *  threads list, current thread's messages, etc. */
// export function onSocketReconnect(handler: () => void) {
//   chat.subs.reconnect.add(handler);
//   void connectChatSocket();
//   return () => {
//     chat.subs.reconnect.delete(handler);
//   };
// }

// /** Fires on every successful socket connect (first session connect included). */
// export function onSocketConnect(handler: () => void) {
//   chat.subs.connect.add(handler);
//   void connectChatSocket();
//   return () => {
//     chat.subs.connect.delete(handler);
//   };
// }

// export function getPresenceState(userId: string) {
//   return chat.presence.get(userId) ?? { isOnline: false, lastSeenAt: null };
// }

// export async function clearSessionToken() {
//   await disconnectChatSocket();
//   await setAccessToken(null);
// }
