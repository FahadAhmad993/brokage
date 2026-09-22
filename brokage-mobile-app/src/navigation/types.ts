import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ChatListingRef } from '../types/models';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOtp: {
    email: string;
    purpose: 'signup' | 'login';
    /** Carried through only so the OTP screen can save it locally (biometric-style re-login) once verification succeeds — never sent anywhere itself. */
    password: string;
  };
};

// MapExplore: add back when map is funded (see HomeStackNavigator + HomeScreen FAB).
export type HomeStackParamList = {
  Home: undefined;
  PropertyDetail: { propertyId: string };
  AddProperty: undefined;
  MyListings: undefined;
  SavedProperties: undefined;
};

/**
 * `ChatThread` lives on `MainStackParamList`, NOT here. Pushing it above
 * the tab navigator is how the native bottom tabs library hides the bar
 * for a chat conversation — there's no `tabBarHideOnKeyboard` on the
 * native UITabBarController / BottomNavigationView, so a screen that
 * should hide the tabs has to be a sibling of the tab nav, not its child.
 */
export type ChatsStackParamList = {
  ChatList:
    | {
        mode?: 'all' | 'group';
        title?: string;
        subtitle?: string;
      }
    | undefined;
};

/**
 * Profile tab now only owns the landing `ProfileHome`. The editable
 * sub-screens (Settings, EditProfile, ChangePassword) live on the
 * parent `MainStackParamList` — pushing them above the tab nav hides
 * the native bottom tab bar, so it can't ride up with the soft keyboard
 * on Android `adjustResize`. Same pattern used for `ChatThread`.
 */
export type ProfileStackParamList = {
  ProfileHome: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  GroupChatsTab: NavigatorScreenParams<ChatsStackParamList>;
  ChatsTab: NavigatorScreenParams<ChatsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Stack that wraps the tab navigator. `ChatThread` is pushed on top of
 * `Tabs`, which is what causes the native tab bar to disappear while a
 * conversation is open (the tab nav is below the pushed screen and not
 * rendered by the native stack on iOS / fragment-detached on Android).
 */
export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;

  ChatThread: {
    threadId: string;
    title: string;
    relatedListing?: ChatListingRef;
    /** Pre-fills the composer — used by "Shared an Add" and similar flows. */
    initialDraft?: string;
    /**
     * WhatsApp-style "Reply Privately": set when this DM was opened by
     * tapping someone else's community message. Renders as a dismissible
     * quote-preview bar above the composer (NOT pasted into the input) —
     * the sender types their own reply, and the quote travels with it as
     * `replyToCommunityMessage` on the outgoing message.
     */
    replyToMessage?: {
      messageId: string;
      threadId: string;
      threadTitle: string;
      body: string;
      imageUrl?: string | null;
      authorId: string;
      authorName?: string | null;
      authorAvatarUrl?: string | null;
    };
  };
  // Profile sub-screens hoisted from ProfileStack so they hide the bottom
  // tab bar while open (the bar can't be hidden in place on the native
  // tab nav).
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  BlockedUsers: undefined;
  UserProfile: {
    userId: string;
    displayName?: string;
  };
  CreateCommunityPost: undefined;
  CommunityPostDetails: {
  postId: string;
  post: {
    id: string;
    title: string;
    description: string;
    city: string;
    images: string[];
    authorId: string;
    authorName?: string | null;
    authorAvatarUrl?: string | null;
  };
};

  // "My Display" (own storefront) / viewing someone else's, and the
  // "Add Post" form — hoisted here for the same reason as ChatThread etc.
  // above: these are full-screen flows that should hide the bottom tab bar.
  MyDisplay: undefined;
  UserDisplay: {
    userId: string;
    displayName?: string;
  };
  CreateDisplayPost: {
    /** Present when editing an existing post instead of creating a new one. */
    editPost?: import('../types/models').DisplayPost;
  } | undefined;
  DisplaySearchResults: {
    query: string;
  };
};
