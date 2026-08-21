import type {
  ChatListingRef,
  ChatMessage,
  ChatThread,
  Property,
  User,
} from '../types/models';

export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'alex@example.com', displayName: 'Alex Rivera' },
  { id: 'u2', email: 'sam@example.com', displayName: 'Sam Okonkwo' },
];

export const COMMON_GROUP_THREAD_ID = 'thread-common';

const LISTER_AVATARS: Record<string, string> = {
  u1: 'https://i.pravatar.cc/256?img=12',
  u2: 'https://i.pravatar.cc/256?img=33',
};

/** Seed properties — image URLs from Figma MCP exports (replace with CDN in production). */
export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'p1',
    title: 'The Ethereal Loft',
    location: 'Downtown, San Francisco',
    priceMonthly: 2500,
    imageUrl:
      'https://www.figma.com/api/mcp/asset/cd70cbab-1994-4bbe-8293-b9163f8d26fc',
    imageUrls: [
      'https://www.figma.com/api/mcp/asset/cd70cbab-1994-4bbe-8293-b9163f8d26fc',
      'https://www.figma.com/api/mcp/asset/3bd93907-7e0c-40ac-b2d1-bf2b9d3e3f99',
      'https://www.figma.com/api/mcp/asset/275addbe-db8b-4461-93ff-44c9727b9149',
    ],
    category: 'urban_lofts',
    isPremium: true,
    features: [
      { label: '2 beds', icon: 'bed' },
      { label: '1 bath', icon: 'bath' },
      { label: '1,200 sqft', icon: 'sqft' },
    ],
    lister: {
      id: MOCK_USERS[0].id,
      displayName: MOCK_USERS[0].displayName,
      avatarUrl: LISTER_AVATARS[MOCK_USERS[0].id],
      bio: 'Usually replies within an hour · Verified host',
    },
  },
  {
    id: 'p2',
    title: 'Azure Sands Estate',
    location: 'Malibu, California',
    priceMonthly: 4800,
    imageUrl:
      'https://www.figma.com/api/mcp/asset/3bd93907-7e0c-40ac-b2d1-bf2b9d3e3f99',
    imageUrls: [
      'https://www.figma.com/api/mcp/asset/3bd93907-7e0c-40ac-b2d1-bf2b9d3e3f99',
      'https://www.figma.com/api/mcp/asset/275addbe-db8b-4461-93ff-44c9727b9149',
      'https://www.figma.com/api/mcp/asset/cd70cbab-1994-4bbe-8293-b9163f8d26fc',
    ],
    category: 'villas',
    features: [
      { label: '4 beds', icon: 'bed' },
      { label: '3 baths', icon: 'bath' },
      { label: '6,200 sqft', icon: 'sqft' },
      { label: 'Infinity Pool', icon: 'pool' },
      { label: 'Beachfront', icon: 'beach' },
    ],
    lister: {
      id: MOCK_USERS[1].id,
      displayName: MOCK_USERS[1].displayName,
      avatarUrl: LISTER_AVATARS[MOCK_USERS[1].id],
      bio: 'Coastal stays specialist · 5 years on Brokage',
    },
  },
  {
    id: 'p3',
    title: 'The Nordic Hideaway',
    location: 'Aspen, Colorado',
    priceMonthly: 1900,
    imageUrl:
      'https://www.figma.com/api/mcp/asset/275addbe-db8b-4461-93ff-44c9727b9149',
    imageUrls: [
      'https://www.figma.com/api/mcp/asset/275addbe-db8b-4461-93ff-44c9727b9149',
      'https://www.figma.com/api/mcp/asset/cd70cbab-1994-4bbe-8293-b9163f8d26fc',
      'https://www.figma.com/api/mcp/asset/3bd93907-7e0c-40ac-b2d1-bf2b9d3e3f99',
    ],
    category: 'shared',
    features: [
      { label: 'Winterized', icon: 'snow' },
      { label: 'Fireplace', icon: 'fire' },
    ],
    lister: {
      id: MOCK_USERS[0].id,
      displayName: MOCK_USERS[0].displayName,
      avatarUrl: LISTER_AVATARS[MOCK_USERS[0].id],
      bio: 'Mountain retreats · Flexible check-in',
    },
  },
];

/** Default cover when a listing has no photos saved. */
export const DEFAULT_USER_LISTING_IMAGE = MOCK_PROPERTIES[1].imageUrl;

function buildStaticThreads(): ChatThread[] {
  return [
    {
      id: COMMON_GROUP_THREAD_ID,
      type: 'group',
      title: 'Brokage Commons',
      subtitle: 'Everyone’s welcome — community updates & discovery.',
      lastMessage: 'Welcome to the neighborhood. Introduce yourself!',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'thread-dm-1',
      type: 'direct',
      title: MOCK_USERS[1].displayName,
      peerUserId: MOCK_USERS[1].id,
      lastMessage: 'Hey! Still interested in the loft viewing?',
      updatedAt: new Date(Date.now() - 3600_000).toISOString(),
      unreadCount: 1,
    },
  ];
}

/** DM threads created at runtime (e.g. from “Message host” on a listing). */
let dynamicDirectThreads: ChatThread[] = [];

/** Merges preview / listing context for any thread id (static or dynamic). */
const threadOverrides: Record<
  string,
  Partial<
    Pick<ChatThread, 'lastMessage' | 'updatedAt' | 'relatedListing' | 'unreadCount'>
  >
> = {};

function applyThreadOverrides(t: ChatThread): ChatThread {
  const o = threadOverrides[t.id];
  return o ? { ...t, ...o } : t;
}

/**
 * Reuse an existing DM with this peer if present; otherwise create a thread id
 * stable per peer so the inbox stays deduped.
 */
export function ensureDirectThread(
  peerUserId: string,
  peerDisplayName: string,
  opts?: { listing?: ChatListingRef },
): ChatThread {
  const combined = [...buildStaticThreads(), ...dynamicDirectThreads];
  const found = combined.find(
    t => t.type === 'direct' && t.peerUserId === peerUserId,
  );
  if (found) {
    if (opts?.listing) {
      threadOverrides[found.id] = {
        ...threadOverrides[found.id],
        relatedListing: opts.listing,
        lastMessage: `Re: ${opts.listing.title}`,
        updatedAt: new Date().toISOString(),
      };
    }
    return applyThreadOverrides(found);
  }
  const t: ChatThread = {
    id: `thread-peer-${peerUserId}`,
    type: 'direct',
    title: peerDisplayName,
    peerUserId,
    relatedListing: opts?.listing,
    lastMessage: opts?.listing
      ? `Re: ${opts.listing.title}`
      : 'Say hello to start the conversation.',
    updatedAt: new Date().toISOString(),
  };
  dynamicDirectThreads = [...dynamicDirectThreads, t];
  return applyThreadOverrides(t);
}

export function buildInitialThreads(_me: User): ChatThread[] {
  const threads = [...buildStaticThreads(), ...dynamicDirectThreads];
  const seen = new Map<string, ChatThread>();
  for (const t of threads) {
    seen.set(t.id, applyThreadOverrides(t));
  }
  return Array.from(seen.values()).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * Adds a guest message that references the listing (once per listing id per thread).
 * Call after ensureDirectThread when opening “Message host”.
 */
export function ensureListingIntroMessage(
  threadId: string,
  user: User,
  listing: ChatListingRef,
) {
  seedMessagesIfNeeded(threadId, user);
  const msgs = messagesByThread[threadId] ?? [];
  const already = msgs.some(m => m.listingContext?.id === listing.id);
  if (already) {
    return;
  }
  const msg: ChatMessage = {
    id: `m-intro-${listing.id}-${Date.now()}`,
    threadId,
    authorId: user.id,
    authorName: user.displayName,
    body: `I'm interested in "${listing.title}". Is it still available?`,
    listingContext: listing,
    createdAt: new Date().toISOString(),
  };
  appendMessage(threadId, msg);
}

const messagesByThread: Record<string, ChatMessage[]> = {};

export function seedMessagesIfNeeded(threadId: string, me: User) {
  if (messagesByThread[threadId]?.length) {
    return;
  }
  if (threadId === COMMON_GROUP_THREAD_ID) {
    messagesByThread[threadId] = [
      {
        id: 'm1',
        threadId,
        authorId: 'system',
        authorName: 'Brokage',
        body: 'You\'ve been added to Brokage Commons — say hello to the community.',
        createdAt: new Date(Date.now() - 86400_000).toISOString(),
      },
      {
        id: 'm2',
        threadId,
        authorId: MOCK_USERS[1].id,
        authorName: MOCK_USERS[1].displayName,
        body: 'Welcome! Excited to see what listings everyone is browsing.',
        createdAt: new Date(Date.now() - 3600_000).toISOString(),
      },
    ];
    return;
  }
  if (threadId.startsWith('thread-peer-')) {
    messagesByThread[threadId] = [];
    return;
  }
  messagesByThread[threadId] = [
    {
      id: 'dm1',
      threadId,
      authorId: MOCK_USERS[1].id,
      authorName: MOCK_USERS[1].displayName,
      body: 'Hey! Still interested in the loft viewing?',
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
    },
    {
      id: 'dm2',
      threadId,
      authorId: me.id,
      authorName: me.displayName,
      body: 'Yes — does Thursday work?',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ];
}

export function getMessages(threadId: string): ChatMessage[] {
  return messagesByThread[threadId] ?? [];
}

export function appendMessage(threadId: string, msg: ChatMessage) {
  if (!messagesByThread[threadId]) {
    messagesByThread[threadId] = [];
  }
  messagesByThread[threadId].push(msg);
  const raw = msg.body.trim();
  const preview = msg.listingContext
    ? `Listing · ${msg.listingContext.title}`
    : raw.length > 72
      ? `${raw.slice(0, 72)}…`
      : raw || 'Message';
  threadOverrides[threadId] = {
    ...threadOverrides[threadId],
    lastMessage: preview,
    updatedAt: msg.createdAt,
  };
}
