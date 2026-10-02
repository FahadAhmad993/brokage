export type PropertyCategory =
  | 'all'
  | 'urban_lofts'
  | 'villas'
  | 'shared';

export type PropertyFeature = { label: string; icon?: string };

/** Host / owner shown on listing detail and used for direct messages. */
export type PropertyLister = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  /** Short line for the detail screen (e.g. response time). */
  bio?: string;
};

export type Property = {
  id: string;
  title: string;
  location: string;
  priceMonthly: number;
  /** Cover image for cards and lists — should match `imageUrls[0]` when `imageUrls` is set. */
  imageUrl: string;
  /** Full gallery (newest-first or user order); omit for single-image listings. */
  imageUrls?: string[];
  category: Exclude<PropertyCategory, 'all'>;
  isPremium?: boolean;
  features: PropertyFeature[];
  /** Populated for user-published listings when available */
  description?: string;
  /** Who published the listing — used for host profile + chat. */
  lister: PropertyLister;
};

/** Host-owned listing record (persisted locally in this build). */
export type ListingStatus = 'live' | 'paused';

export type ManagedListing = Property & {
  ownerId: string;
  status: ListingStatus;
  updatedAt: string;
};

export type ChatThreadType = 'group' | 'direct';

/** Listing snapshot shown in inbox, thread header, and listing-tagged messages. */
export type ChatListingRef = {
  id: string;
  title: string;
  imageUrl: string;
  location: string;
  priceMonthly: number;
};

export type ChatThread = {
  id: string;
  type: ChatThreadType;
  title: string;
  subtitle?: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount?: number;
  peerUserId?: string;
  peerAvatarUrl?: string | null;
  /** Latest listing this DM is about (e.g. from “Message host”). */
  relatedListing?: ChatListingRef;
};

/** Shared-location attachment on a chat message. */
export type ChatLocationRef = {
  latitude: number;
  longitude: number;
  /** Human-readable place name/address; bubble falls back to coords if absent. */
  label?: string | null;
};

/**
 * Optimistic-UI lifecycle of a message before/after server confirmation.
 *
 * WhatsApp-style tick mapping (see ChatThreadScreen bubble renderer):
 *   'queued'  → clock icon   — saved locally, no network yet (offline outbox)
 *   'sending' → clock icon   — in-flight request, device is online
 *   'sent'    → single check — server accepted it
 *   'read'    → double check (tinted) — peer has read it
 *   'failed'  → red outline + retry — a real (non-connectivity) rejection
 */
export type ChatMessageStatus = 'queued' | 'sending' | 'sent' | 'read' | 'failed';

export type ChatMessage = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  imageUrl?: string;
  /** Avatar URL of the message author — used in group threads to render an
   *  avatar circle alongside the bubble. */
  authorAvatarUrl?: string | null;
  body: string;
  createdAt: string;
  /** When set, UI shows a listing card with this message (e.g. interest from a guest). */
  listingContext?: ChatListingRef;
  /** When set, UI shows a map preview with this message (shared location). */
  locationContext?: ChatLocationRef;
  /**
   * Client-generated idempotency key. Optimistic messages set this before the
   * round-trip; the server echoes it back so we can reconcile with the
   * confirmed row instead of duplicating it on the broadcast event.
   */
  clientId?: string;
  /**
   * UI-only — undefined for confirmed server messages, set on optimistic
   * inserts. Bubbles read this to render a spinner / failed-state.
   */
  status?: ChatMessageStatus;
  groupAdContext?: ChatGroupAdRef;
  communityPostContext?: {
  id: string;
  title: string;
  description: string;
  city: string;
  images: string[];
  authorId: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  /** Omitted = a Community feed ad (unchanged). 'display' = a broker's Display post. */
  kind?: 'community' | 'display';
  /** Only set when kind is 'display'. */
  marlaSize?: number;
} | null;
  /**
   * WhatsApp-style "Reply Privately": a frozen snapshot of the community
   * (group) message this private message is replying to. Set only on
   * messages sent from a DM that was opened by tapping a community
   * message. The quoted community text is never copied into `body` —
   * bubbles render this as its own preview block above the reply.
   */
  replyToCommunityMessage?: {
    messageId: string;
    threadId: string;
    threadTitle: string;
    body: string;
    imageUrl?: string | null;
    authorId: string;
    authorName?: string | null;
    authorAvatarUrl?: string | null;
  } | null;
  /** Author-only "delete for everyone" applied — body/image are already
   *  blanked by the server; bubbles render a "message deleted" placeholder. */
  isDeletedForEveryone?: boolean;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  /** Local `file://` / `content://` URI from device photo picker (not sent to server in mock mode). */
  avatarUri?: string;
  /** Backend hosted avatar URL when available. */
  avatarUrl?: string;
  phone?: string;
  estateName?: string;
};

/**
 * Safe, non-sensitive view of another user's profile — returned by
 * `GET /users/:id` and shown on the "tap a chat peer's name" screen.
 */
export type PublicUserProfile = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  estateName?: string;
};

export type GroupAd = {
  id: string;

  userId: string;

  title: string;
  description: string;

  city?: string;
  location?: string;

  images: string[];

  createdAt: string;
  updatedAt: string;

  advertiserName: string;
  advertiserAvatar?: string | null;
};
export type ChatGroupAdRef = {
  id: string;
  title: string;
  description?: string;
  city?: string;
  location?: string;
  imageUrl: string;
  advertiserName?: string;
  advertiserAvatar?: string | null;
};

/* ─────── Display (Profile → Display) ─────── */

export type DisplayPostStatus = 'pending' | 'active' | 'sold' | 'expired' | 'rejected';

export type DisplayPost = {
  id: string;
  userId: string;
  images: string[];
  /** The one required spec — plot/house size in Marla. */
  marlaSize: number;
  city?: string | null;
  area?: string | null;
  description?: string | null;
  /** Distinct visitors (owner excluded) — shown as the eye + "members" badge. */
  viewCount?: number;
  /** Optional specs left as free key→value — bedrooms, bathrooms, kitchen, carporch, tvLounge, etc. */
  extraFields: Record<string, string>;
  durationHours: number;
  price: number;
  status: DisplayPostStatus;
  expiresAt?: string | null;
  remainingSeconds?: number | null;
  soldAt?: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  /** The broker's phone number from their profile — null if they never set one. */
  authorPhone?: string | null;
};

export type DisplayProfile = {
  userId: string;
  coverImageUrl: string | null;
};

export type DisplayPostConfig = {
  pricePerHourPkr: number;
  minImages: number;
  maxImages: number;
};

/** One "who's talking" broker card in the Community search results grid. */
export type DisplayBrokerCard = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  estateName: string | null;
  matchingPost: DisplayPost;
  totalMatches: number;
};
