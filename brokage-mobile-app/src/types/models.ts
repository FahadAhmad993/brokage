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

/** Optimistic-UI lifecycle of a message before/after server confirmation. */
export type ChatMessageStatus = 'sending' | 'sent' | 'failed';

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