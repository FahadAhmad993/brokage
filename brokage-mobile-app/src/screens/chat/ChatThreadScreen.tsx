import { launchCamera, launchImageLibrary, PhotoQuality } from 'react-native-image-picker';
import type { NativeBottomTabNavigationProp } from '@bottom-tabs/react-navigation';
import { useHeaderHeight } from '@react-navigation/elements';
import { ChatListingAttachment } from '../../components/chat/ChatListingAttachment';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

// import { MapPin, Send } from 'lucide-react-native';
import {
  Camera,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Image as ImageIcon,
  MapPin,
  MoreVertical,
  Paperclip,
  Send,
  Trash2,
  X,
} from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
   Alert,
  FlatList,
  Image,
  PanResponder,
  Platform,
    PermissionsAndroid,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ListRenderItem,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import LinearGradient from 'react-native-linear-gradient';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
//1
import Clipboard from '@react-native-clipboard/clipboard';
import {
  createOrOpenDirectThread,
  clearThreadMessages,
  deleteMessage,
  emitTypingStart,
  emitTypingStop,
  fetchMessagesPage,
  fetchThreads,
  getPresenceState,
  errorMessage,
  joinChatThreadSocket,
  leaveChatThreadSocket,
  markThreadRead,
  newClientMessageId,
  onIncomingChatMessage,
  onMessageDeleted,
  onMessageRead,
  onPresenceUpdate,
  onTypingUpdate,
  sendChatMessage,
  fetchCommunityPosts,
  blockUser,
  unblockUser,
  fetchBlockedUsers,
} from '../../api/client';
import { ChatCommunityPostAttachment } from '../../components/chat/ChatCommunityPostAttachment';
import { LocationPickerModal } from '../../components/chat/LocationPickerModal';
import { ReportSheetModal } from '../../components/chat/ReportSheetModal';
import { ActionMenu, type ActionMenuItem } from '../../components/ActionMenu';

import { ChatLocationAttachment } from '../../components/chat/ChatLocationAttachment';
import { ChatImageViewerModal } from '../../components/chat/ChatImageViewerModal';
import { captureCurrentLocation, describeLocation } from '../../lib/shareLocation';
// import {pickListingImages,takeChatPhoto,} from '../../lib/pickListingImages';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import {
  navigateToChatsThread,
  navigateToHomeStackScreen,
} from '../../navigation/crossTabNavigate';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import type {
  ChatListingRef,
  ChatLocationRef,
  ChatMessage,
  ChatMessageStatus,
  ChatThread,
} from '../../types/models';
import { useActiveChatThreadStore } from '../../stores/activeChatThreadStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { formatMessageTime } from '../../utils/formatChatTime';
import {
  filterMessagesInInfinitePages,
  flattenMessagePages,
  mapMessagesInInfinitePages,
  markMessageClientStatusInPages,
  seedOrMergeOwnMessage,
  type MessagesPageResult,
} from '../../chat/messagePages';
import { sameId } from '../../chat/threadUnread';
import {
  enqueueOutboxMessage,
  isConnectivityError,
  removeOutboxMessage,
} from '../../chat/offlineOutbox';


type Route = RouteProp<MainStackParamList, 'ChatThread'>;

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MainStackParamList, 'ChatThread'>,
  NativeBottomTabNavigationProp<MainTabParamList>
>;

/** Auto-clear a peer's "typing…" indicator after this long with no fresh
 *  `typing:update` event — guards against missed `stop` events. */
const TYPING_RECEIVE_TTL_MS = 4000;

/** Local debounce: emit `typing:stop` after this long of input inactivity. */
const TYPING_STOP_DEBOUNCE_MS = 1500;

/** Must stay ≤ backend PaginationQueryDto max (100). */
const MESSAGE_PAGE_SIZE = 50;

/**
 * Community/group messages whose first letter (case-insensitive) matches
 * this get a pulsing glow so they stand out from the rest of the timeline —
 * e.g. flagging "R..." (Real Estate) leads/announcements. Change this one
 * constant to re-target a different letter.
 */
const HIGHLIGHT_TRIGGER_LETTER = 'R';

function messageNeedsHighlight(body: string): boolean {
  const first = body.trim().charAt(0);
  return first.length > 0 && first.toUpperCase() === HIGHLIGHT_TRIGGER_LETTER;
}

/** Wraps a message bubble with a looping glow/blink so it visually stands
 *  out from the rest of the group-chat timeline. Pure opacity + shadow
 *  pulse via the core `Animated` API — no extra native deps needed. */
function GlowingMessageWrap({ children }: { children: React.ReactNode }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primarySoft, colors.primary],
  });

  return (
    <Animated.View
      style={{
        borderWidth: 2,
        borderRadius: layout.radius.lg + 2,
        borderColor,
        shadowColor: colors.primary,
        shadowOpacity: glowOpacity as unknown as number,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
      }}>
      {children}
    </Animated.View>
  );
}

const buildChatThreadNavTitleStyles = () =>
  StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    // Bound the title so a long thread name doesn't push against the header
    // edges and break the centered alignment.
    maxWidth: 220,
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.headline,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

function ChatThreadNavTitle({
  title,
  statusLabel,
  onPress,
}: {
  title: string;
  statusLabel: string;
  onPress?: () => void;
}) {
  const chatThreadNavTitleStyles = useThemedStyles(buildChatThreadNavTitleStyles);
  const content = (
    <View style={chatThreadNavTitleStyles.wrap}>
      <Text numberOfLines={1} style={chatThreadNavTitleStyles.title}>
        {title}
      </Text>
      <Text numberOfLines={1} style={chatThreadNavTitleStyles.subtitle}>
        {statusLabel}
      </Text>
    </View>
  );
  if (!onPress) {
    return content;
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}'s profile`}>
      {content}
    </Pressable>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar circle for the message sender. Renders the user's photo when
 * available, otherwise a colored circle with their initials so group-chat
 * messages always have a visual identifier.
 */
function SenderAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string;
  name: string;
}) {
  const senderAvatarStyles = useThemedStyles(buildSenderAvatarStyles);
  const [failed, setFailed] = React.useState(false);
  if (avatarUrl && !failed) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={senderAvatarStyles.image}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={senderAvatarStyles.fallback}>
      <Text style={senderAvatarStyles.initials}>{getInitials(name)}</Text>
    </View>
  );
}

const buildSenderAvatarStyles = () =>
  StyleSheet.create({
  image: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  fallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
});



// adds code 1 start

type GroupAd = {
  id: string;
  userId: string;

  title: string;
  description: string;
  city?: string;
  area?: string;

  images: string[];

  createdAt: string;
  updatedAt: string;

  /** Seconds left before this ad expires (server-computed, active ads only). */
  remainingSeconds?: number | null;

  // Comes from the existing chat message author
  advertiserName: string;
  advertiserAvatar?: string;
};

/** Total time (ms) an ad stays on screen before auto-advancing to the next one. */
const AD_TOTAL_DURATION_MS = 15000;
/** Never flip images faster than this even if an ad has many photos. */
const AD_MIN_IMAGE_DURATION_MS = 1200;
/** Cross-fade length between two photos of the same ad. */
const AD_IMAGE_FADE_MS = 320;
/** How long the closed album (the stack of prints) is shown up front. */
const AD_COVER_MS = 1600;
/** How long the last photo takes to drop back onto the stack at the end. */
const AD_CLOSE_MS = 700;
/** How many prints are drawn in the closed-album stack. */
const AD_COVER_MAX_CARDS = 4;

/**
 * Fixed card height.
 *
 * WHY FIXED (this was the bug): every wrapper in the old version used
 * `flex: 1`. A horizontal FlatList sizes its rows by their *content*, so a
 * row whose height comes only from `flex: 1` collapses to zero — the card
 * rendered with 0px of image area, which is why nothing but a dark strip
 * showed up. An explicit pixel height gives the image area something real
 * to fill.
 */
const AD_CARD_HEIGHT = 300;
const AD_IMAGE_HEIGHT = 190;

/** "3h left" — deliberately hours-only, shown next to the city. */
function formatAdHoursLeft(remainingSeconds?: number | null): string | null {
  if (remainingSeconds == null || remainingSeconds <= 0) {
    return null;
  }
  const hours = Math.ceil(remainingSeconds / 3600);
  return `${hours}h left`;
}

/**
 * Cross-fading photo album for one ad.
 *
 * Deliberately NOT a nested horizontal FlatList/ScrollView: the ad carousel
 * around it already scrolls horizontally, and two nested horizontal
 * scrollers fight over the same gesture — the outer one always wins, so
 * manual image swipes never registered. Instead every photo is stacked
 * absolutely and cross-faded via opacity, and manual navigation happens
 * through tap zones (left half = previous, right half = next), which don't
 * compete with the parent's swipe at all.
 */
/** Which part of an ad's 15-second slot we're currently in. */
type AdPhase = 'cover' | 'photos' | 'closing';

/**
 * The closed album: a stack of tilted prints, top one square-on, the rest
 * fanned out behind it (the shape in the reference icon). Shown when an ad
 * arrives and again as it finishes, so each ad visibly opens and closes.
 */
function AdAlbumCover({ images }: { images: string[] }) {
  const styles = useThemedStyles(buildStyles);
  const cards = images.slice(0, AD_COVER_MAX_CARDS);
  // Drawn back-to-front so the first photo ends up on top of the pile.
  const ordered = [...cards].reverse();

  return (
    <View style={styles.groupAdCoverWrap}>
      {ordered.map((uri, i) => {
        // `depth` 0 = top card. Deeper cards sit lower-right and lean more.
        const depth = ordered.length - 1 - i;
        return (
          <View
            key={`${uri}-${depth}`}
            style={[
              styles.groupAdCoverCard,
              {
                transform: [
                  { translateX: depth * 12 },
                  { translateY: depth * 8 },
                  { rotate: `${depth * 4}deg` },
                ],
                zIndex: AD_COVER_MAX_CARDS - depth,
              },
            ]}
          >
            <Image source={{ uri }} style={styles.groupAdImageFill} resizeMode="cover" />
          </View>
        );
      })}
    </View>
  );
}

function AdImageAlbum({
  images,
  imageIndex,
  phase,
  onNext,
  onPrev,
}: {
  images: string[];
  imageIndex: number;
  phase: AdPhase;
  onNext: () => void;
  onPrev: () => void;
}) {
  const styles = useThemedStyles(buildStyles);
  /*
   * Warm Fresco's / the iOS image cache for EVERY photo as soon as the ad
   * appears.
   *
   * This is the fix for "first photo shows, the rest are black". The album
   * used to stack all photos on top of each other and flip opacity. On
   * Android an <Image> inside a fully transparent view is never decoded,
   * and because the opacity animation runs on the native driver, React
   * never re-renders it — so the moment a photo became visible it still had
   * nothing decoded to draw and painted black. Prefetching means the bytes
   * are already in cache before a photo is ever shown.
   */
  useEffect(() => {
    images.forEach(uri => {
      Image.prefetch(uri).catch(() => {
        // Prefetch is an optimisation — a miss just means a brief load on
        // display, so a failure here must never break the carousel.
      });
    });
  }, [images]);

  const safeIndex = images.length ? (imageIndex + images.length) % images.length : 0;

  /*
   * Horizontal swipe over the photo steps through the album.
   *
   * This works because the ad list around it no longer scrolls by touch
   * (`scrollEnabled={false}` — it's driven programmatically). Two nested
   * horizontal gesture handlers always ended with the outer one winning,
   * which is why swiping a photo previously did nothing at all.
   */
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx < -40) {
            onNext();
          } else if (gesture.dx > 40) {
            onPrev();
          }
        },
      }),
    [onNext, onPrev],
  );

  const showingCover = phase !== 'photos';

  return (
    <View style={styles.groupAdAlbumStage} {...swipe.panHandlers}>
      {showingCover ? (
        <AdAlbumCover images={images} />
      ) : (
        <View style={styles.groupAdImageContainer}>
          {/*
            Exactly ONE photo is mounted at a time, keyed by its URL. A
            changed key remounts the <Image>, which guarantees a real
            load/draw cycle — no reliance on opacity tricks that Android can
            optimise away.
          */}
          <AdAlbumFrame key={images[safeIndex]} uri={images[safeIndex]} />

          {/* Tap the left/right half as well as swiping. */}
          {images.length > 1 ? (
            <View style={styles.groupAdTapZones}>
              <Pressable
                style={styles.groupAdTapZone}
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
              />
              <Pressable
                style={styles.groupAdTapZone}
                onPress={onNext}
                accessibilityRole="button"
                accessibilityLabel="Next photo"
              />
            </View>
          ) : null}

          {images.length > 1 ? (
            <View style={styles.groupAdPhotoCounter} pointerEvents="none">
              <Text style={styles.groupAdPhotoCounterText}>
                {safeIndex + 1}/{images.length}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

/**
 * One album photo, animating as if it were just slid off the top of the
 * pile: it starts tilted, slightly smaller and offset toward the stack,
 * then settles square into the frame.
 *
 * The animation lives on a wrapper view, never on the <Image> itself, so
 * the image is always fully mounted and decoded regardless of the
 * animation's state (see the prefetch note above — this is what stopped
 * photos rendering black).
 */
function AdAlbumFrame({ uri }: { uri: string }) {
  const styles = useThemedStyles(buildStyles);
  const enter = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = React.useState(false);

  const revealed = useCallback(() => {
    Animated.spring(enter, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  // Reveal even if onLoad never fires (cached images can skip it on some
  // Android builds) so a photo can never be stuck invisible.
  useEffect(() => {
    const fallbackTimer = setTimeout(revealed, 400);
    return () => clearTimeout(fallbackTimer);
  }, [revealed]);

  if (failed) {
    return (
      <View style={[styles.groupAdImageFrame, styles.groupAdNoImage]}>
        <Text style={styles.groupAdNoImageText}>Photo unavailable</Text>
      </View>
    );
  }

  const animatedStyle = {
    opacity: enter,
    transform: [
      { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['4deg', '0deg'] }) },
    ],
  };

  return (
    <Animated.View style={[styles.groupAdImageFrame, animatedStyle]}>
      <Image
        source={{ uri }}
        style={styles.groupAdImageFill}
        resizeMode="cover"
        onLoad={revealed}
        onError={({ nativeEvent }) => {
          console.warn('[ad album] photo failed to load', uri, nativeEvent?.error);
          setFailed(true);
        }}
      />
    </Animated.View>
  );
}

function GroupAdsCarousel({
  ads,
  onAdvertiserPress,
}: {
  ads: GroupAd[];
  // Tapping the advertiser's icon or name should open a direct chat
  // with that user, with the ad copied along as the related listing.
  onAdvertiserPress?: (ad: GroupAd) => void;
}) {
  const styles = useThemedStyles(buildStyles);
  const { width: screenWidth } = useWindowDimensions();

  const validAds = useMemo(
    () =>
      ads.filter(
        ad => Array.isArray(ad.images) && ad.images.length > 0 && ad.title?.trim(),
      ),
    [ads],
  );

  const [adIndex, setAdIndex] = React.useState(0);
  const [imageIndex, setImageIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<AdPhase>('cover');

  const adListRef = React.useRef<FlatList<GroupAd>>(null);

  /*
   * IMPORTANT:
   * Hooks must always run in the same order.
   * So useCallback/useEffect must NOT come after an early return.
   */

  const goToAd = useCallback(
    (nextIndex: number) => {
      if (validAds.length === 0) {
        return;
      }

      const safeIndex = (nextIndex + validAds.length) % validAds.length;

      setAdIndex(safeIndex);
      setImageIndex(0);
      // Every ad starts closed, so the album visibly opens for each one.
      setPhase('cover');

      adListRef.current?.scrollToIndex({ index: safeIndex, animated: true });
    },
    [validAds.length],
  );

  const currentAd = validAds[adIndex];
  const currentImageCount = Math.max(1, currentAd?.images.length ?? 1);

  /** Forward: next photo, close the album on the last one, or — if the
   *  album isn't open yet (cover/closing) — swipe straight to the next ad. */
  const showNext = useCallback(() => {
    if (phase !== 'photos') {
      goToAd(adIndex + 1);
      return;
    }
    if (imageIndex < currentImageCount - 1) {
      setImageIndex(previous => previous + 1);
    } else {
      setPhase('closing');
    }
  }, [adIndex, currentImageCount, goToAd, imageIndex, phase]);

  /** Back: previous photo, step back to the previous ad on the first one,
   *  or — if the album isn't open yet (cover/closing) — swipe straight to
   *  the previous ad. */
  const showPrev = useCallback(() => {
    if (phase !== 'photos') {
      goToAd(adIndex - 1);
      return;
    }
    if (imageIndex > 0) {
      setImageIndex(previous => previous - 1);
    } else {
      goToAd(adIndex - 1);
    }
  }, [adIndex, goToAd, imageIndex, phase]);

  // ================================
  // THE 15-SECOND SLOT
  //
  //   cover   — the closed album sits there for a beat
  //   photos  — each photo in turn, sharing whatever time is left
  //   closing — the last photo drops back onto the pile, then next ad
  //
  // Any manual swipe/tap restarts the running timer, because this effect
  // is keyed on phase/imageIndex/adIndex.
  // ================================

  React.useEffect(() => {
    if (!currentAd) {
      return;
    }

    if (phase === 'cover') {
      const timer = setTimeout(() => setPhase('photos'), AD_COVER_MS);
      return () => clearTimeout(timer);
    }

    if (phase === 'closing') {
      const timer = setTimeout(() => goToAd(adIndex + 1), AD_CLOSE_MS);
      return () => clearTimeout(timer);
    }

    const perImageMs = Math.max(
      AD_MIN_IMAGE_DURATION_MS,
      (AD_TOTAL_DURATION_MS - AD_COVER_MS - AD_CLOSE_MS) / currentImageCount,
    );

    const timer = setTimeout(() => {
      if (imageIndex < currentImageCount - 1) {
        setImageIndex(previous => previous + 1);
      } else {
        setPhase('closing');
      }
    }, perImageMs);

    return () => clearTimeout(timer);
  }, [phase, imageIndex, adIndex, currentAd, currentImageCount, goToAd]);

  /*
   * Ab saare hooks call ho chuke hain.
   * Iske baad early return safe hai.
   */
  if (validAds.length === 0 || !currentAd) {
    return null;
  }

  return (
    <FlatList
      ref={adListRef}
      data={validAds}
      horizontal
      pagingEnabled
      // Ads advance on their own timer / via the album's own swipe handler.
      // Leaving this scrollable would put a second horizontal gesture
      // handler around the photos, and the outer one always wins — that's
      // why swiping a photo used to do nothing.
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      bounces={false}
      decelerationRate="fast"
      snapToAlignment="start"
      keyExtractor={item => item.id}
      style={styles.groupAdList}
      // FlatList only re-renders rows when `data`/`extraData` changes.
      // adIndex/imageIndex/phase live in this component's state and aren't
      // part of `validAds`, so without this the timer updated state but the
      // visible row never re-rendered.
      extraData={`${adIndex}-${imageIndex}-${phase}`}
      getItemLayout={(_, index) => ({
        length: screenWidth,
        offset: screenWidth * index,
        index,
      })}
      renderItem={({ item, index }) => {
        const isCurrentAd = index === adIndex;
        const hoursLeft = formatAdHoursLeft(item.remainingSeconds);

        return (
          <View style={[styles.groupAdPage, { width: screenWidth }]}>
            <View style={styles.groupAdCard}>
              {/* ================= */}
              {/* ADVERTISER (icon + name + title) — LEFT
                  CITY + TIME LEFT — RIGHT */}
              {/* ================= */}

              <View style={styles.groupAdHeader}>
                <Pressable
                  style={styles.groupAdAdvertiserPressable}
                  onPress={() => onAdvertiserPress?.(item)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${item.advertiserName} about ${item.title}`}
                >
                  <SenderAvatar avatarUrl={item.advertiserAvatar} name={item.advertiserName} />

                  <View style={styles.groupAdHeaderText}>
                    <Text style={styles.groupAdAdvertiser} numberOfLines={1}>
                      {item.advertiserName}
                    </Text>

                    <Text style={styles.groupAdTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                </Pressable>

                {/* City on top, hours-left directly beneath it. */}
                <View style={styles.groupAdMetaColumn}>
                  {item.city || item.area ? (
                    <View style={styles.groupAdLocationBadge}>
                      <MapPin
                        color={colors.textSecondary}
                        size={iconSize.xs}
                        strokeWidth={iconStroke}
                      />
                      <Text style={styles.groupAdLocationText} numberOfLines={1}>
                        {item.city || item.area}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.groupAdBadge}>
                      <Text style={styles.groupAdBadgeText}>Ad</Text>
                    </View>
                  )}

                  {hoursLeft ? (
                    <Text style={styles.groupAdTimeLeftText}>{hoursLeft}</Text>
                  ) : null}
                </View>
              </View>

              {/* ================= */}
              {/* DESCRIPTION */}
              {/* ================= */}

              <Text style={styles.groupAdDescription} numberOfLines={1}>
                {item.description}
              </Text>

              {/* ================= */}
              {/* THE ALBUM — opens, plays its photos, closes again. Only
                  the visible ad animates; the rest stay closed. */}
              {/* ================= */}

              {isCurrentAd ? (
                <AdImageAlbum
                  images={item.images}
                  imageIndex={imageIndex}
                  phase={phase}
                  onNext={showNext}
                  onPrev={showPrev}
                />
              ) : (
                <View style={styles.groupAdAlbumStage}>
                  <AdAlbumCover images={item.images} />
                </View>
              )}

              {/* ================= */}
              {/* AD DOTS — which ad we're on, updates as ads advance */}
              {/* ================= */}

              <View style={styles.groupAdIndicatorRow}>
                {validAds.map((_, dotIndex) => (
                  <View
                    key={`ad-dot-${dotIndex}`}
                    style={[
                      styles.groupAdDot,
                      dotIndex === adIndex && styles.groupAdDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}
// adds code 1 end



export function ChatThreadScreen() {
  const styles = useThemedStyles(buildStyles);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { threadId, title, relatedListing: paramListing } = route.params;
  const user = useAuthStore(s => s.user);
  const setActiveThreadId = useActiveChatThreadStore(s => s.setActiveThreadId);
  const queryClient = useQueryClient();

  /** "Clear all messages" — this user's view only; the other participant's
   *  history is untouched. Declared early (right after `queryClient`) since
   *  the header's `useLayoutEffect` deps array below reads it immediately. */
  const onClearChat = useCallback(() => {
    Alert.alert(
      'Clear all messages?',
      "This clears the chat on your side only — it won't be deleted for the other person.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Optimistic: empty the timeline immediately.
            queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
              ['messages', threadId, user?.id],
              prev => filterMessagesInInfinitePages(prev, () => false),
            );
            clearThreadMessages(threadId).catch(err => {
              Alert.alert('Could not clear chat', errorMessage(err, 'Please try again.'));
              void queryClient.invalidateQueries({
                queryKey: ['messages', threadId, user?.id],
              });
            });
          },
        },
      ],
    );
  }, [queryClient, threadId, user?.id]);

  const [draft, setDraft] = React.useState(route.params.initialDraft ?? '');
  /**
   * WhatsApp-style "Reply Privately" pending quote — set when this DM was
   * opened by tapping someone else's community message (see
   * `replyPrivatelyToMessage`). Rendered as a dismissible preview bar
   * above the composer; the quoted community text is intentionally never
   * written into `draft`, so the input stays empty for the user's own
   * reply.
   */
  const [pendingReply, setPendingReply] = React.useState(route.params.replyToMessage ?? null);
  /** Full-screen WhatsApp-style photo viewer — null/undefined = closed. */
  const [viewerImageUrl, setViewerImageUrl] = React.useState<string | null>(null);
  /**
   * `ChatThread` is a single screen reused across navigations (see
   * `navigateToChatsThread` / `crossTabNavigate.ts` — it dispatches
   * `CommonActions.navigate` by route name, which brings an already-open
   * `ChatThread` back into focus and just updates its params instead of
   * remounting). That means the `useState` initializers above only ever
   * run once, on the very first time this screen mounts.
   *
   * This effect re-applies `initialDraft` / `replyToMessage` whenever a
   * *new* navigation lands on this already-open screen (new `route.params`
   * object), and clears stale state when switching to a different thread
   * with no quote/draft of its own.
   */
  const prevRouteParamsRef = React.useRef(route.params);
  const prevDraftThreadIdRef = React.useRef(threadId);
  React.useEffect(() => {
    if (prevRouteParamsRef.current === route.params) {
      return;
    }
    prevRouteParamsRef.current = route.params;
    const threadChanged = prevDraftThreadIdRef.current !== threadId;
    prevDraftThreadIdRef.current = threadId;
    if (route.params.initialDraft) {
      setDraft(route.params.initialDraft);
    } else if (threadChanged) {
      setDraft('');
    }
    if (route.params.replyToMessage) {
      setPendingReply(route.params.replyToMessage);
    } else if (threadChanged) {
      setPendingReply(null);
    }
  }, [route.params, threadId]);

  const cancelPendingReply = React.useCallback(() => {
    setPendingReply(null);
  }, []);

  const [typingName, setTypingName] = React.useState<string | null>(null);
  const [peerOnline, setPeerOnline] = React.useState<boolean | null>(null);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [isSendingImage, setIsSendingImage] = React.useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = React.useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [reportSheetOpen, setReportSheetOpen] = React.useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messageInputRef = useRef<TextInput>(null);
  /**
   * Inverted list: small `contentOffset.y` ⇒ user is viewing the newest messages
   * (same idea as WhatsApp — no scrollToEnd on open).
   */
  const nearNewestRef = useRef(true);




  /** Mounted stack screens beneath a pushed ChatThread stay mounted but unfocused — never mark-read for those. */
  const isScreenFocusedRef = useRef(isFocused);
  React.useEffect(() => {
    isScreenFocusedRef.current = isFocused;
  }, [isFocused]);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);



    const threadsQuery = useQuery({
    queryKey: ['threads', user?.id],
    queryFn: () => fetchThreads(user!),
    enabled: !!user,
    select: list => list.find(t => sameId(t.id, threadId)),
  });

  const isGroupThread = threadsQuery.data?.type === 'group';

  // Group thread title now comes straight from the backend (renamed to
  // "Real Estate community" there) so there's a single source of truth —
  // no hardcoded override to drift out of sync.
  const displayTitle = threadsQuery.data?.title ?? title;
  const relatedListing = useMemo(
    () => paramListing ?? threadsQuery.data?.relatedListing,
    [paramListing, threadsQuery.data?.relatedListing],
  );

  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', threadId, user?.id],
    queryFn: ({ pageParam }) =>
      fetchMessagesPage(threadId, user!, pageParam as number, MESSAGE_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    enabled: !!user,
    retry: 2,
  });

  /**
   * Pin `activeThreadId` synchronously (`useLayoutEffect`) before paint — a late
   * `useEffect` left tabs summing unread for the open chat for one frame (badge "1").
   * AppState listener keeps foreground/background in sync.
   */
  const syncActiveConversationPins = useCallback(() => {
    if (!isFocused) {
      setActiveThreadId(prev => (sameId(prev, threadId) ? null : prev));
      return;
    }
    const state = AppState.currentState;
    if (state === 'background') {
      setActiveThreadId(prev => (sameId(prev, threadId) ? null : prev));
      return;
    }
    setActiveThreadId(threadId);
  }, [isFocused, setActiveThreadId, threadId]);

  useLayoutEffect(() => {
    syncActiveConversationPins();
  }, [syncActiveConversationPins]);

  useEffect(() => {
    const appSub = AppState.addEventListener('change', syncActiveConversationPins);
    return () => {
      appSub.remove();
    };
  }, [syncActiveConversationPins]);

  const data = useMemo(
    () => flattenMessagePages(messagesQuery.data),
    [messagesQuery.data],
  );

  /** Newest first — matches `inverted` so latest messages are at the composer without scrolling. */
  const listData = useMemo(() => [...data].reverse(), [data]);

  const pinToLatest = useCallback(
    (animated: boolean) => {
      if (!listRef.current || listData.length === 0) {
        return;
      }
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({ offset: 0, animated }),
      );
    },
    [listData.length],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (listData.length === 0) {
        nearNewestRef.current = true;
        return;
      }
      nearNewestRef.current = y < 120;
    },
    [listData.length],
  );

  /** Whether we've emitted `typing:start` and not yet emitted `typing:stop`.
   *  Tracked locally so we don't spam `start` on every keystroke. */
  const isTypingRef = useRef(false);
  /** TTL timer for the peer's `typing…` indicator — cleared on every fresh
   *  `typing:update`, fires to auto-clear if `stop` is ever missed. */
  const typingReceiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const upsertMessage = useCallback(
    (message: ChatMessage) => {
      // `seedOrMergeOwnMessage` (unlike the socket-only merge helper) is
      // safe to call on an empty/undefined cache — needed so a message
      // typed the moment a thread is opened offline (before any page has
      // ever loaded) still renders instantly instead of silently vanishing.
      queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
        ['messages', threadId, user?.id],
        prev => seedOrMergeOwnMessage(prev, message),
      );
    },
    [queryClient, threadId, user?.id],
  );

  const markMessageStatus = useCallback(
    (clientId: string, status: ChatMessageStatus) => {
      queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
        ['messages', threadId, user?.id],
        prev => markMessageClientStatusInPages(prev, clientId, status),
      );
    },
    [queryClient, threadId, user?.id],
  );

const send = useMutation({
  mutationFn: async ({
    body,
    clientId,
    locationContext,
    imageUrl,
    replyToCommunityMessage,
  }: {
    body: string;
    clientId: string;
    locationContext?: ChatMessage['locationContext'];
    imageUrl?: string;
    replyToCommunityMessage?: ChatMessage['replyToCommunityMessage'];
  }) => {
    // Check connectivity *before* touching the network. Previously, sending
    // while offline meant waiting out a full socket ack timeout (up to
    // 10s) before the bubble flipped to "failed" — this short-circuits that
    // immediately so the composer never feels stuck, and the message drops
    // straight into the "queued" (clock icon) state instead.
    const net = await NetInfo.fetch();
    if (!net.isConnected || net.isInternetReachable === false) {
      throw new Error('offline: message queued');
    }
    return sendChatMessage(
      threadId,
      user!,
      body,
      clientId,
      locationContext,
      imageUrl,
      undefined,
      replyToCommunityMessage,
    );
  },

  onMutate: ({ body, clientId, locationContext, imageUrl, replyToCommunityMessage }) => {
    setSendError(null);

    if (user) {
      // Persist to the on-disk outbox *before* anything else. This is what
      // guarantees the message survives an app kill/crash while offline —
      // `AppProviders`' NetInfo listener will find and send it later even
      // if this screen was never reopened.
      void enqueueOutboxMessage({
        clientId,
        threadId,
        body: body.trim(),
        locationContext,
        imageUrl,
        replyToCommunityMessage,
        queuedAt: new Date().toISOString(),
      });

      upsertMessage({
        id: `optimistic-${clientId}`,
        threadId,
        authorId: user.id,
        authorName: user.displayName,
         authorAvatarUrl: user.avatarUrl,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        clientId,
        // Instant, optimistic — shows immediately regardless of connection;
        // flips to 'queued' (clock) in `onError` if we're actually offline,
        // or 'sent' (single check) the moment the server confirms it.
        status: 'sending',

        ...(locationContext ? { locationContext } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(replyToCommunityMessage ? { replyToCommunityMessage } : {}),
      });

      queryClient.setQueryData<ChatThread[] | undefined>(
        ['threads', user.id],
        prev =>
          (prev ?? []).map(t =>
            sameId(t.id, threadId)
              ? { ...t, unreadCount: 0 }
              : t,
          ),
      );
    }

    // Clear the composer & reply preview immediately — sending must never
    // feel gated on the network round trip.
    setDraft('');
    setPendingReply(null);
    nearNewestRef.current = true;
    pinToLatest(true);

    return { clientId };
  },

  onSuccess: (message, _vars, context) => {
    if (context?.clientId) {
      void removeOutboxMessage(threadId, context.clientId);
    }

    upsertMessage({
      ...message,
      status: 'sent',
    });

    pinToLatest(true);

    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  },

  onError: (err, _vars, context) => {
    if (!context?.clientId) {
      return;
    }
    if (isConnectivityError(err)) {
      // Not a rejection — just no connection right now. Leave it queued
      // (already persisted in `onMutate`); the app-level auto-flush will
      // deliver it the instant connectivity returns, no retry tap needed.
      markMessageStatus(context.clientId, 'queued');
      return;
    }

    // A genuine server rejection (blocked user, validation, etc.) — this
    // will never succeed by silently retrying, so drop it from the outbox
    // and let the person see a real failed state with a manual retry.
    void removeOutboxMessage(threadId, context.clientId);
    markMessageStatus(context.clientId, 'failed');
    setSendError(
      errorMessage(
        err,
        'Could not send message',
      ),
    );
  },
});

  const flushTypingStop = useCallback(() => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTypingStop(threadId);
    }
  }, [threadId]);

  const dispatchTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTypingStart(threadId);
    }
    // Reset the inactivity timer — peer sees `typing` until we go quiet for
    // TYPING_STOP_DEBOUNCE_MS, then we send `stop`.
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    typingDebounceRef.current = setTimeout(() => {
      typingDebounceRef.current = null;
      isTypingRef.current = false;
      emitTypingStop(threadId);
    }, TYPING_STOP_DEBOUNCE_MS);
  }, [threadId]);

  const retryFailedMessage = useCallback(
    (failed: ChatMessage) => {
      if (!user) {
        return;
      }
      // Reuse the original clientId so the server dedupes against any
      // orphaned earlier row; only synthesize a new one for messages that
      // somehow never had one (legacy data, mock-mode rows).
      const clientId = failed.clientId ?? newClientMessageId();
      markMessageStatus(clientId, 'sending');
      send.mutate({ body: failed.body, clientId });
    },
    [markMessageStatus, send, user],
  );

  React.useEffect(() => {
    nearNewestRef.current = true;
    return () => {
      // Component unmount: stop typing, leave the room (so the server can
      // free it and we don't keep collecting events for an unmounted screen).
      flushTypingStop();
      if (typingReceiveTimeoutRef.current) {
        clearTimeout(typingReceiveTimeoutRef.current);
        typingReceiveTimeoutRef.current = null;
      }
      void leaveChatThreadSocket(threadId);
    };
  }, [threadId, flushTypingStop]);

  const statusLabel =
    threadsQuery.data?.type === 'direct'
      ? peerOnline === null
        ? 'Checking status...'
        : peerOnline
          ? 'Online'
          : 'Offline'
      : 'Group chat';

  // Only 1:1 threads have a single peer to show a profile for — group
  // threads have many participants, so the title stays non-interactive there.
  const peerUserIdForProfile =
    threadsQuery.data?.type === 'direct' ? threadsQuery.data?.peerUserId : undefined;

  const openPeerProfile = React.useCallback(() => {
    if (!peerUserIdForProfile) {
      return;
    }
    navigation.navigate('UserProfile', {
      userId: peerUserIdForProfile,
      displayName: displayTitle,
    });
  }, [navigation, peerUserIdForProfile, displayTitle]);

  /** `null` = not checked yet, `true`/`false` once known. Direct threads only. */
  const [peerBlocked, setPeerBlocked] = React.useState<boolean | null>(null);
  const [blockActionPending, setBlockActionPending] = React.useState(false);

  React.useEffect(() => {
    if (!peerUserIdForProfile) {
      return;
    }
    let cancelled = false;
    fetchBlockedUsers()
      .then(res => {
        if (!cancelled) {
          setPeerBlocked(res.items.some(u => u.id === peerUserIdForProfile));
        }
      })
      .catch(() => {
        if (!cancelled) setPeerBlocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [peerUserIdForProfile]);

  const setBlocked = React.useCallback(
    async (value: boolean) => {
      if (!peerUserIdForProfile || blockActionPending) {
        return;
      }
      setBlockActionPending(true);
      try {
        await (value ? blockUser(peerUserIdForProfile) : unblockUser(peerUserIdForProfile));
        setPeerBlocked(value);
      } catch (err) {
        Alert.alert(
          value ? 'Could not block user' : 'Could not unblock user',
          errorMessage(err, 'Please try again.'),
        );
      } finally {
        setBlockActionPending(false);
      }
    },
    [blockActionPending, peerUserIdForProfile],
  );

  const confirmBlock = React.useCallback(() => {
    Alert.alert(
      `Block ${displayTitle ?? 'this user'}?`,
      "They won't be able to message you, and you won't see their community ads anymore.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => setBlocked(true) },
      ],
    );
  }, [displayTitle, setBlocked]);

  /** Header "⋮" menu for a direct thread: Clear chat / Block-or-Unblock / Report / Cancel.
   *  Group threads keep the old single-tap "Clear chat" behavior. */
  const headerMenuButtonRef = useRef<View>(null);
  const [chatMenuOpen, setChatMenuOpen] = React.useState(false);
  const [chatMenuAnchor, setChatMenuAnchor] = React.useState<{ x: number; y: number } | null>(null);

  const openChatOptionsMenu = React.useCallback(() => {
    if (!peerUserIdForProfile) {
      onClearChat();
      return;
    }
    headerMenuButtonRef.current?.measureInWindow((x, y, _w, h) => {
      setChatMenuAnchor({ x: x + _w, y: y + h + 6 });
      setChatMenuOpen(true);
    });
  }, [onClearChat, peerUserIdForProfile]);

  const chatMenuItems: ActionMenuItem[] = React.useMemo(
    () => [
      { label: 'Clear chat', onPress: onClearChat },
      peerBlocked
        ? { label: 'Unblock user', onPress: () => setBlocked(false) }
        : { label: 'Block user', destructive: true, onPress: confirmBlock },
      { label: 'Report user', destructive: true, onPress: () => setReportSheetOpen(true) },
      { label: 'Cancel', onPress: () => {} },
    ],
    [confirmBlock, onClearChat, peerBlocked, setBlocked],
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      // React Navigation passes headerTitle as a render function; inner UI is a stable module component.
      // eslint-disable-next-line react/no-unstable-nested-components -- RN headerTitle API
      headerTitle: () => (
  <ChatThreadNavTitle
    title={displayTitle ?? '…'}
    statusLabel={statusLabel}
    onPress={peerUserIdForProfile ? openPeerProfile : undefined}
  />
),
      // eslint-disable-next-line react/no-unstable-nested-components -- RN headerRight API
      headerRight: () => (
        <Pressable
          ref={headerMenuButtonRef}
          onPress={openChatOptionsMenu}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Chat options">
          <MoreVertical color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
        </Pressable>
      ),
    });
  }, [navigation, statusLabel, displayTitle, peerUserIdForProfile, openPeerProfile, onClearChat, openChatOptionsMenu]);

  React.useEffect(() => {
    if (!user?.id) {
      return;
    }
    // Optimistic local clear so the unread badge disappears immediately when
    // the screen mounts. The server-authoritative reset happens via
    // `joinChatThreadSocket` → `thread:join` (server marks read + broadcasts
    // `thread:update`) so the cache will be reconciled by AppProviders.
    queryClient.setQueryData(
      ['threads', user?.id],
      (prev: {
        id: string;
        unreadCount?: number;
      }[] | undefined) =>
        (prev ?? []).map((thread) =>
          sameId(thread.id, threadId) ? { ...thread, unreadCount: 0 } : thread,
        ),
    );

    // `joinChatThreadSocket` emits `thread:join`, which the server uses to
    // mark unread=0 *and* broadcast a read receipt to peers. Don't double up
    // with a separate `markThreadRead` here — the server already does both.
    void joinChatThreadSocket(threadId);

    // `message:new` cache merge is owned by `subscribeChatRealtimeSync` so
    // background threads stay in sync. Here we only mark peer messages read
    // when this thread screen is focused AND the app is foreground: a screen
    // can stay mounted under another pushed ChatThread; AppState.active alone
    // would wrongly clear unread for the thread underneath.
    const offMessage = onIncomingChatMessage(message => {
      if (!sameId(message.threadId, threadId)) {
        return;
      }
      if (message.authorId === user?.id) {
        return;
      }
      if (!isScreenFocusedRef.current) {
        return;
      }
      if (AppState.currentState !== 'active') {
        return;
      }
      void markThreadRead(threadId);
    });

    return () => {
      offMessage();
    };
  }, [queryClient, threadId, user?.id]);

  React.useEffect(() => {
    const offTyping = onTypingUpdate(payload => {
      if (
        !sameId(payload.threadId, threadId) ||
        payload.userId === user?.id
      ) {
        return;
      }
      if (typingReceiveTimeoutRef.current) {
        clearTimeout(typingReceiveTimeoutRef.current);
        typingReceiveTimeoutRef.current = null;
      }
      if (payload.isTyping) {
        setTypingName(payload.userName);
        // Self-clear in case `typing:stop` is dropped (network glitch, peer
        // app crash, etc.) — without this the indicator could stick forever.
        typingReceiveTimeoutRef.current = setTimeout(() => {
          typingReceiveTimeoutRef.current = null;
          setTypingName(null);
        }, TYPING_RECEIVE_TTL_MS);
      } else {
        setTypingName(null);
      }
    });
    const offPresence = onPresenceUpdate(payload => {
      const peerId = threadsQuery.data?.peerUserId;
      if (peerId && payload.userId === peerId) {
        setPeerOnline(payload.isOnline);
      }
    });
    const offRead = onMessageRead(payload => {
      if (
        !sameId(payload.threadId, threadId) ||
        payload.userId === user?.id
      ) {
        return;
      }
      // Mark the user's own previously-sent messages as read up to readAt —
      // this is what flips the WhatsApp-style single check to a double
      // (tinted) check the instant the peer opens the thread.
      queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
        ['messages', threadId, user?.id],
        prev =>
          mapMessagesInInfinitePages(prev, m =>
            m.authorId === user?.id && (m.status === 'sent' || m.status === 'read')
              ? { ...m, status: 'read' }
              : m,
          ),
      );
    });
    const offDeleted = onMessageDeleted(payload => {
      if (!sameId(payload.threadId, threadId)) {
        return;
      }
      queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
        ['messages', threadId, user?.id],
        prev =>
          mapMessagesInInfinitePages(prev, m =>
            m.id === payload.messageId
              ? { ...m, isDeletedForEveryone: true, body: '', imageUrl: undefined }
              : m,
          ),
      );
    });
    const peerId = threadsQuery.data?.peerUserId;
    if (peerId) {
      setPeerOnline(getPresenceState(peerId).isOnline);
    }
    return () => {
      offTyping();
      offPresence();
      offRead();
      offDeleted();
    };
  }, [queryClient, threadId, user?.id, threadsQuery.data?.peerUserId]);

  const openListing = (propertyId: string) => {
    navigateToHomeStackScreen(navigation, 'PropertyDetail', { propertyId });
  };

  const [isCapturingLocation, setIsCapturingLocation] = React.useState(false);







  const sendLocationMessage = useCallback(
    (location: ChatLocationRef) => {
      if (!user) {
        return;
      }
      // Body doubles as the inbox preview text — use the address (or
      // coordinates) so threads list shows "📍 …" instead of an empty row.
      const body = `📍 ${describeLocation(location)}`;
      send.mutate({
        body,
        clientId: newClientMessageId(),
        locationContext: location,
      });
      flushTypingStop();
    },
    [flushTypingStop, send, user],
  );

  const shareCurrentLocation = useCallback(async () => {
    if (!user || isCapturingLocation || send.isPending) {
      return;
    }
    setAttachmentMenuOpen(false);
    setIsCapturingLocation(true);
    setSendError(null);
    try {
      const location = await captureCurrentLocation();
      sendLocationMessage(location);
    } catch (err) {
      setSendError(errorMessage(err, 'Could not share your location'));
    } finally {
      setIsCapturingLocation(false);
    }
  }, [isCapturingLocation, send, sendLocationMessage, user]);


const sendChatImage = useCallback(
  async (uri: string) => {
    if (!user || isSendingImage || send.isPending) {
      return;
    }

    setIsSendingImage(true);
    setSendError(null);

    try {
      // 1. Upload local image to Cloudinary
      const imageUrl = await uploadImageToCloudinary(uri);

      console.log('Cloudinary image URL:', imageUrl);

      // 2. Send Cloudinary URL through chat
      send.mutate({
        body: '📷 Photo',
        clientId: newClientMessageId(),
        imageUrl,
      });

      flushTypingStop();
    } catch (err) {
      setSendError(
        errorMessage(
          err,
          'Could not upload and send image',
        ),
      );
    } finally {
      setIsSendingImage(false);
    }
  },
  [
    user,
    isSendingImage,
    send,
    flushTypingStop,
  ],
);



  //image picker

const pickImageFromGallery = useCallback(async () => {
  if (!user || send.isPending || isSendingImage) {
    return;
  }

  setAttachmentMenuOpen(false);
  setSendError(null);

 try {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.85 as PhotoQuality,
  });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      setSendError(
        result.errorMessage ?? 'Could not open gallery',
      );
      return;
    }

    const asset = result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

    // Upload to Cloudinary and send chat message
    await sendChatImage(asset.uri);
  } catch (err) {
    setSendError(
      errorMessage(
        err,
        'Could not select image',
      ),
    );
  }
}, [
  user,
  send.isPending,
  isSendingImage,
  sendChatImage,
]);


const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera Permission',
      message: 'This app needs camera permission to take photos.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    },
  );

  return permission === PermissionsAndroid.RESULTS.GRANTED;
};




//camera take photo
const takePhoto = useCallback(async () => {
  if (!user || send.isPending || isSendingImage) {
    return;
  }

  setAttachmentMenuOpen(false);
  setSendError(null);

  try {
    // Request camera permission before opening camera
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      setSendError('Camera permission is required to take a photo.');
      return;
    }

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
    quality: 0.85 as PhotoQuality,
      saveToPhotos: false,
    });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      setSendError(
        result.errorMessage ?? 'Could not open camera',
      );
      return;
    }

    const asset = result.assets?.[0];

    if (!asset?.uri) {
      setSendError('No photo was captured.');
      return;
    }

    await sendChatImage(asset.uri);
  } catch (err) {
    console.error('Camera error:', err);

    setSendError(
      errorMessage(
        err,
        'Could not capture image',
      ),
    );
  }
}, [
  user,
  send.isPending,
  isSendingImage,
  sendChatImage,
]);



const openDirectWithUser = useCallback(
  async (
    peerUserId: string,
    peerName: string,
    listing?: ChatListingRef,
  ) => {
    if (!user || peerUserId === user.id) {
      return;
    }

    try {
      const thread = await createOrOpenDirectThread(
        peerName,
        peerUserId,
      );

      queryClient.setQueryData<ChatThread[] | undefined>(
        ['threads', user.id],
        prev => {
          const list = prev ?? [];

          const idx = list.findIndex(
            t => sameId(t.id, thread.id),
          );

          const updatedThread = {
            ...thread,
          };

          if (idx >= 0) {
            const next = [...list];
            next[idx] = {
              ...next[idx],
              ...updatedThread,
            };
            return next;
          }

          return [updatedThread, ...list];
        },
      );

      queryClient.invalidateQueries({
        queryKey: ['threads', user.id],
      });

      navigateToChatsThread(navigation, {
        threadId: thread.id,
        title: thread.title,
       
      });
    } catch (err) {
      setSendError(
        errorMessage(err, 'Could not open chat'),
      );
    }
  },
  [navigation, queryClient, user],
);

// Tapping a community/group message itself (not the author name, which
// opens their profile) — WhatsApp-style "reply privately": opens/creates
// the DM with that sender and shows the quoted message as a preview bar
// above an EMPTY composer (never copied into the input as text).
const replyPrivatelyToMessage = useCallback(
  async (message: ChatMessage) => {
    if (!user || !message.authorId || message.authorId === user.id) {
      return;
    }
    try {
      const thread = await createOrOpenDirectThread(
        message.authorName,
        message.authorId,
      );
      navigateToChatsThread(navigation, {
        threadId: thread.id,
        title: thread.title,
        replyToMessage: {
          messageId: message.id,
          threadId: message.threadId,
          threadTitle: threadsQuery.data?.title ?? 'Community',
          body: message.body?.trim()?.slice(0, 500) ?? '',
          imageUrl: message.imageUrl ?? null,
          authorId: message.authorId,
          authorName: message.authorName,
          authorAvatarUrl: message.authorAvatarUrl ?? null,
        },
      });
    } catch (err) {
      setSendError(errorMessage(err, 'Could not open chat'));
    }
  },
  [navigation, user, threadsQuery.data?.title],
);
  // Tapping an ad's advertiser icon/name: open (or jump to) the direct
  // chat with that user, with the ad copied along as the chat's related
  // listing — same as tapping a listing card elsewhere in the thread.
 const openAdvertiserChatFromAd = useCallback(
  async (ad: GroupAd) => {
    if (!user || !ad.userId) {
      return;
    }

    try {
      const thread = await createOrOpenDirectThread(
        ad.advertiserName,
        ad.userId,
      );

      const addContext: ChatMessage['communityPostContext'] = {
        id: ad.id,
        title: ad.title,
        description: ad.description ?? '',
        city: ad.city ?? '',
        images: ad.images ?? [],
        authorId: ad.userId,
        authorName: ad.advertiserName,
        authorAvatarUrl: ad.advertiserAvatar ?? null,
      };

      await sendChatMessage(
        thread.id,
        user,
        'Shared an Add',
        newClientMessageId(),
        undefined,
        undefined,
        addContext,
      );

      queryClient.invalidateQueries({
        queryKey: ['threads', user.id],
      });

      queryClient.invalidateQueries({
        queryKey: ['messages', thread.id, user.id],
      });

      navigateToChatsThread(navigation, {
        threadId: thread.id,
        title: thread.title,
      });
    } catch (err) {
      setSendError(
        errorMessage(err, 'Could not send Add'),
      );
    }
  },
  [
    navigation,
    queryClient,
    user,
  ],
);

 

  // Group threads need to identify the sender on every author switch. Direct
  // threads don't (the header already names the peer). Default to direct
  // until the thread query resolves so a flicker can't briefly show the name.
// ============================================================
// COMMUNITY CHAT USERS
// Reuse the SAME name + avatar that is already used by chat
// messages. We do not fetch/store another user profile here.
// ============================================================


// ============================================================
// COMMUNITY ADS
//
// We DO NOT fetch another user/profile API here.
//
// The chat backend already gives us:
//   authorId
//   authorName
//   authorAvatarUrl
//
// We reuse that SAME data for the advertiser.
// post.userId is matched with message.authorId.
// ============================================================
const communityPostsQuery = useQuery({
  queryKey: ['community-posts'],
  queryFn: fetchCommunityPosts,
  enabled: isGroupThread,

  select: posts =>
    posts
      .filter(
        post =>
          Array.isArray(post.images) &&
          post.images.length > 0 &&
          post.title?.trim(),
      )
      .map(post => ({
        id: post.id,
        userId: post.userId,
        title: post.title,
        description: post.description,
        city: post.city,
        area: post.area,
        // Guard the album against bad rows: drop blank/duplicate URLs so a
        // repeated upload can't look like a stuck photo, and so an empty
        // string can't render as a black frame.
        images: Array.from(
          new Set(
            (post.images ?? []).filter(
              (uri): uri is string => typeof uri === 'string' && uri.trim().length > 0,
            ),
          ),
        ),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        remainingSeconds: post.remainingSeconds,

        // Same user record that backend uses for chat users.
        advertiserName: post.authorName ?? 'User',
        advertiserAvatar:
          post.authorAvatarUrl ?? undefined,
      })),
});

  //add navigatoin to post add
    const openCreateCommunityPost = useCallback(() => {
  if (!isGroupThread) {
    return;
  }
  navigation.navigate('CreateCommunityPost');
}, [isGroupThread, navigation]);

//end


//2
/**
 * Mark a message as deleted-for-everyone in the local cache immediately
 * (optimistic) — the real-time `message:deleted` socket event does the same
 * for the peer's screen, and for our own other devices/sessions.
 */
const markMessageDeletedForEveryoneInCache = useCallback(
  (messageId: string) => {
    queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
      ['messages', threadId, user?.id],
      prev =>
        mapMessagesInInfinitePages(prev, m =>
          m.id === messageId
            ? { ...m, isDeletedForEveryone: true, body: '', imageUrl: undefined }
            : m,
        ),
    );
  },
  [queryClient, threadId, user?.id],
);

const removeMessageFromOwnView = useCallback(
  (messageId: string) => {
    queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
      ['messages', threadId, user?.id],
      prev => filterMessagesInInfinitePages(prev, m => m.id !== messageId),
    );
  },
  [queryClient, threadId, user?.id],
);

const onDeleteForMe = useCallback(
  (item: ChatMessage) => {
    // Optimistic: hide immediately, roll back only if the request fails.
    removeMessageFromOwnView(item.id);
    deleteMessage(item.id, 'me').catch(err => {
      Alert.alert('Could not delete', errorMessage(err, 'Please try again.'));
      void queryClient.invalidateQueries({ queryKey: ['messages', threadId, user?.id] });
    });
  },
  [removeMessageFromOwnView, queryClient, threadId, user?.id],
);

const onDeleteForEveryone = useCallback(
  (item: ChatMessage) => {
    markMessageDeletedForEveryoneInCache(item.id);
    deleteMessage(item.id, 'everyone').catch(err => {
      Alert.alert('Could not delete', errorMessage(err, 'Please try again.'));
      void queryClient.invalidateQueries({ queryKey: ['messages', threadId, user?.id] });
    });
  },
  [markMessageDeletedForEveryoneInCache, queryClient, threadId, user?.id],
);

const [messageMenu, setMessageMenu] = React.useState<{
  anchor: { x: number; y: number };
  item: ChatMessage;
} | null>(null);

const handleMessageLongPress = useCallback(
  (item: ChatMessage, pageX: number, pageY: number) => {
    if (item.authorId === 'system' || item.isDeletedForEveryone) {
      return;
    }
    setMessageMenu({ anchor: { x: pageX, y: pageY }, item });
  },
  [],
);

const messageMenuItems: ActionMenuItem[] = React.useMemo(() => {
  const item = messageMenu?.item;
  if (!item) return [];
  const mine = item.authorId === user?.id;
  const hasText = item.body?.trim().length > 0;

  const items: ActionMenuItem[] = [];

  // Copy — text messages only, never for images.
  if (hasText && !item.imageUrl) {
    items.push({ label: 'Copy', onPress: () => Clipboard.setString(item.body) });
  }

  items.push({
    label: 'Delete for me',
    destructive: true,
    onPress: () => onDeleteForMe(item),
  });

  // "Delete for everyone" only ever applies to messages the current user sent.
  if (mine) {
    items.push({
      label: 'Delete for everyone',
      destructive: true,
      onPress: () =>
        Alert.alert(
          'Delete for everyone?',
          'This message will be removed for everyone in this chat.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete for everyone',
              style: 'destructive',
              onPress: () => onDeleteForEveryone(item),
            },
          ],
        ),
    });
  }

  return items;
}, [messageMenu, onDeleteForEveryone, onDeleteForMe, user?.id]);

/** "Clear all messages" — this user's view only; the other participant's
 *  history is untouched. Offered from the header's overflow menu. Declared
 *  earlier in the component (right after `queryClient`) so it's already
 *  initialized before the header effect's deps array reads it. */


const renderItem: ListRenderItem<ChatMessage> = ({ item, index }) => {
  if (item.authorId === 'system') {
    return (
      <View style={styles.systemWrap}>
        <View style={styles.systemBubble}>
          <Text style={styles.systemText}>
            {item.body}
          </Text>
        </View>

        <Text style={styles.timeMuted}>
          {formatMessageTime(item.createdAt)}
        </Text>
      </View>
    );
  }

  const mine = item.authorId === user?.id;
  const isQueued = mine && item.status === 'queued';
  const isSending = mine && item.status === 'sending';
  const isFailed = mine && item.status === 'failed';
  const isRead = mine && item.status === 'read';
  const isSent = mine && item.status === 'sent';
  const isDeleted = item.isDeletedForEveryone === true;
  // Group-chat messages starting with the trigger letter get a pulsing
  // glow so they stand out from the rest of the timeline.
  const shouldHighlight = isGroupThread && !isDeleted && messageNeedsHighlight(item.body);

  // FlatList is inverted and listData is newest first.
  // index + 1 = older message.
  const olderNeighbour = listData[index + 1];

  const isAuthorRunStart =
    !mine &&
    isGroupThread &&
    (!olderNeighbour ||
      olderNeighbour.authorId !== item.authorId);

  const bubbleContent = (
    <Pressable
      onLongPress={
        isDeleted
          ? undefined
          : event => handleMessageLongPress(item, event.nativeEvent.pageX, event.nativeEvent.pageY)
      }
      onPress={
        // WhatsApp-style "reply privately": tapping a community/group
        // message from someone else opens (or jumps to) the DM with them,
        // with the message quoted in the composer. Own messages, system
        // messages, and direct threads (already private) don't do this.
        !isDeleted && isGroupThread && !mine
          ? () => replyPrivatelyToMessage(item)
          : undefined
      }
      delayLongPress={400}
      style={[
        styles.bubble,
        mine
          ? styles.bubbleMine
          : styles.bubbleThem,
        item.locationContext &&
          styles.bubbleLocation,
        item.imageUrl &&
          styles.bubbleImage,
        isSending &&
          styles.bubbleSending,
        isQueued &&
          styles.bubbleSending,
        isFailed &&
          styles.bubbleFailed,
      ]}
    >
      {isDeleted ? (
        <Text style={[styles.metaHint, mine && styles.bodyMine]}>
          This message was deleted
        </Text>
      ) : (
        <>
          {/* Reply Privately quote — the community message this private
              reply is quoting. Read-only preview, never editable text. */}
          {item.replyToCommunityMessage ? (
            <View style={[styles.quoteBlock, mine && styles.quoteBlockMine]}>
              <View style={styles.quoteAccent} />
              {item.replyToCommunityMessage.imageUrl ? (
                <Image
                  source={{ uri: item.replyToCommunityMessage.imageUrl }}
                  style={styles.quoteThumb}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.quoteTextWrap}>
                <Text style={styles.quoteAuthor} numberOfLines={1}>
                  {item.replyToCommunityMessage.authorName ?? 'Community member'}
                </Text>
                <Text style={styles.quoteBody} numberOfLines={2}>
                  {item.replyToCommunityMessage.body?.trim()
                    ? item.replyToCommunityMessage.body
                    : item.replyToCommunityMessage.imageUrl
                      ? 'Photo'
                      : 'Message'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Image */}
          {item.imageUrl ? (
            <Pressable
              onPress={() => setViewerImageUrl(item.imageUrl ?? null)}
              accessibilityRole="button"
              accessibilityLabel="Open photo">
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.chatImage}
                resizeMode="cover"
              />
            </Pressable>
          ) : null}

          {/* Text */}
          {!item.locationContext &&
           !item.listingContext &&
          !item.imageUrl &&
          item.body.trim().length > 0 ? (
            <Text
              style={[
                styles.body,
                mine && styles.bodyMine,
              ]}
            >
              {item.body}
            </Text>
          ) : null}

          {/* Location */}
          {item.locationContext ? (
            <ChatLocationAttachment
              location={item.locationContext}
            />
          ) : null}

          {item.listingContext ? (
            <ChatListingAttachment
              listing={item.listingContext}
              onPress={() => openListing(item.listingContext!.id)}
            />
          ) : null}
          {item.communityPostContext ? (
            <ChatCommunityPostAttachment
              post={item.communityPostContext}
              onPress={() => {
                const ctx = item.communityPostContext!;
                if (ctx.kind === 'display') {
                  // Display posts live on the broker's Display page, not
                  // in the Community feed — CommunityPostDetails wouldn't
                  // recognize this id at all.
                  navigation.navigate('UserDisplay', {
                    userId: ctx.authorId,
                    displayName: ctx.authorName ?? undefined,
                  });
                  return;
                }
                navigation.navigate('CommunityPostDetails', {
                  postId: ctx.id,
                  post: ctx,
                });
              }}
            />
          ) : null}
        </>
      )}

      {/* Time + sending/failed status */}
      <View
        style={[
          styles.bubbleMetaRow,
          mine
            ? styles.bubbleMetaRowMine
            : styles.bubbleMetaRowThem,
        ]}
      >
        <Text
          style={[
            styles.timeRow,
            mine && styles.bodyMine,
          ]}
        >
          {formatMessageTime(item.createdAt)}
        </Text>

        {/* WhatsApp-style delivery ticks, own messages only:
              queued  → clock (waiting for connection, saved offline)
              sending → clock (in-flight, online)
              sent    → single check
              read    → double check, tinted to stand out */}
        {isQueued ? (
          <View style={styles.tickRow} accessibilityLabel="Queued, will send when online">
            <Clock size={13} color={colors.textMuted} strokeWidth={2} />
          </View>
        ) : null}

        {isSending ? (
          <View style={styles.tickRow} accessibilityLabel="Sending">
            <Clock size={13} color={colors.textMuted} strokeWidth={2} />
          </View>
        ) : null}

        {isSent ? (
          <View style={styles.tickRow} accessibilityLabel="Sent">
            <Check size={14} color={colors.textMuted} strokeWidth={2.5} />
          </View>
        ) : null}

        {isRead ? (
          <View style={styles.tickRow} accessibilityLabel="Read">
            <CheckCheck size={14} color={colors.primary} strokeWidth={2.5} />
          </View>
        ) : null}

        {isFailed ? (
          <>
            <Text style={styles.metaError}>
              Not delivered.
            </Text>

            <Pressable
              onPress={() =>
                retryFailedMessage(item)
              }
              hitSlop={layout.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Retry sending message"
            >
              <Text style={styles.metaRetry}>
                Retry
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View
      style={[
        styles.bubbleWrap,
        mine
          ? styles.bubbleWrapMine
          : styles.bubbleWrapThem,
        // A quoted reply preview needs real width to read comfortably —
        // without this, a short reply ("Ok!") on a long quoted message
        // shrink-wraps the whole bubble down to "Ok!"'s width, squeezing
        // the quote into a tall, cramped, near-unreadable column.
        item.replyToCommunityMessage ? styles.bubbleWrapWithQuote : null,
      ]}
    >
      {/* Group chat author — tap opens their profile (not a chat). */}
      {isAuthorRunStart ? (
        <Pressable
          onPress={() =>
            navigation.navigate('UserProfile', {
              userId: item.authorId,
              displayName: item.authorName,
            })
          }
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.authorName}'s profile`}
          style={({ pressed }) => [
            styles.authorRow,
            pressed && styles.authorRowPressed,
          ]}
        >
          <SenderAvatar
            avatarUrl={
              item.authorAvatarUrl ?? undefined
            }
            name={item.authorName}
          />

          <Text
            style={styles.author}
            numberOfLines={1}
          >
            {item.authorName}
          </Text>
        </Pressable>
      ) : null}

      {/* Direct chat author */}
      {!mine && !isGroupThread ? (
        <Text style={styles.author}>
          {item.authorName}
        </Text>
      ) : null}

      {/* Message bubble — wrapped with a pulsing glow when flagged */}
      {shouldHighlight ? (
        <GlowingMessageWrap>{bubbleContent}</GlowingMessageWrap>
      ) : (
        bubbleContent
      )}
    </View>
  );
};

  // KeyboardAvoidingView (react-native-keyboard-controller) offsets.
  // The header is rendered by `react-native-screens` outside the React view
  // tree, so we compensate with its height. The library's behavior on both
  // platforms uses native `WindowInsetsAnimationCompat` (Android) and
  // `keyboardWillShow` (iOS) — no fragile manual lift math.
  const keyboardOffset = headerHeight;

  // Composer rest-state bottom padding (keyboard closed). ChatThread is
  // now pushed above the tab navigator (via MainStackNavigator) — the
  // native bottom tab bar isn't visible on this route, so the screen
  // extends to the bottom of the window and the composer needs to clear
  // the device's home-indicator / gesture-pill area itself. When the
  // keyboard opens, react-native-keyboard-controller's
  // KeyboardAvoidingView lifts the whole composer block above it.
  const composerBottomPad =
    Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 6) + spacing.xs;

  const listBottomPad = useMemo(
    () =>
      composerBottomPad +
      (sendError ? 28 : 0) +
      56 +
      spacing.md +
      spacing.sm,
    [composerBottomPad, sendError],
  );

  const threadBody = (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {messagesQuery.isError && data.length > 0 ? (
        <View style={styles.retryStrip}>
          <Text style={styles.retryStripText} numberOfLines={2}>
            {errorMessage(messagesQuery.error, 'Messages could not be refreshed.')}
          </Text>
          <Pressable
            onPress={() => messagesQuery.refetch()}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.sendPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading messages">
            <Text style={styles.retryBtnLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
 
 {/* adds code 2 start  */}

{isGroupThread ? (
  <GroupAdsCarousel
    ads={communityPostsQuery.data ?? []}
    onAdvertiserPress={openAdvertiserChatFromAd}
  />
) : null}

 {/* adds code 2 start  */}

      {messagesQuery.isError && data.length === 0 ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>Could not load chat</Text>
          <Text style={styles.stateBody}>
            {errorMessage(messagesQuery.error, 'Check your connection and try again.')}
          </Text>
          <Pressable
            onPress={() => messagesQuery.refetch()}
            style={({ pressed }) => [
              styles.retryBtnLarge,
              pressed && styles.sendPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading messages">
            <Text style={styles.retryBtnLabelLight}>Try again</Text>
          </Pressable>
        </View>
      ) : messagesQuery.isPending && data.length === 0 ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingHint}>Loading messages…</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.listFlex}
          data={listData}
          inverted={listData.length > 0}
          // Prefer the client-generated idempotency key when present so the
          // optimistic placeholder and the server-confirmed message share the
          // same React key — without this, the bubble unmounts and remounts
          // on the optimistic→confirmed swap (visible as a flicker).
          keyExtractor={m => m.clientId ?? m.id}
          extraData={`${listData.length}-${sendError ?? ''}`}
          renderItem={renderItem}
        ListFooterComponent={
  messagesQuery.isFetchingNextPage ? (
    <View style={styles.historyLoading}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.historyLoadingText}>
        Loading earlier messages…
      </Text>
    </View>
  ) : null
}
          ListEmptyComponent={
            <View style={styles.emptyThread}>
              <Text style={styles.emptyThreadTitle}>No messages yet</Text>
              <Text style={styles.emptyThreadBody}>
                Say hello to start the conversation.
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.list,
            listData.length > 0 ? styles.listInverted : styles.listNonInverted,
            listData.length > 0
              ? { paddingTop: listBottomPad }
              : { paddingBottom: listBottomPad },
            listData.length === 0 && styles.listEmptyCentered,
          ]}
          keyboardShouldPersistTaps="always"
          maintainVisibleContentPosition={
            listData.length > 0
              ? { minIndexForVisible: 0, autoscrollToTopThreshold: 24 }
              : undefined
          }
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          onScroll={onScroll}
          scrollEventThrottle={24}
          onEndReached={() => {
            if (
              messagesQuery.hasNextPage &&
              !messagesQuery.isFetchingNextPage
            ) {
              void messagesQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.35}
          initialNumToRender={24}
          maxToRenderPerBatch={16}
          windowSize={12}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android' ? false : undefined}
          overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
        />
      )}

     

         <View
  style={[
    styles.composerDock,
    // Inline override so the composer bar reacts to theme switches
    // immediately (module-level StyleSheet colors are baked in once and
    // don't repaint on their own) and reads a deliberately different tone
    // + top hairline than the header bar, so the two chrome bars are never
    // visually identical again.
    { backgroundColor: colors.bottomBar, borderTopColor: colors.bottomBarBorder },
    { paddingBottom: composerBottomPad },
  ]}
>

  {peerUserIdForProfile && peerBlocked ? (
    <View style={styles.blockedBanner}>
      <Text style={styles.blockedBannerText}>
        You blocked this user. Unblock them to send messages again.
      </Text>
      <View style={styles.blockedBannerActions}>
        <Pressable
          style={[styles.blockedBannerBtn, styles.blockedBannerBtnPrimary]}
          onPress={() => setBlocked(false)}
          disabled={blockActionPending}
          accessibilityRole="button"
          accessibilityLabel="Unblock user">
          {blockActionPending ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.blockedBannerBtnPrimaryLabel}>Unblock</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.blockedBannerBtn}
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel="Cancel">
          <Text style={styles.blockedBannerBtnLabel}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  ) : (
  <>

  {!isGroupThread && attachmentMenuOpen ? (
    <View style={styles.attachmentMenu}>
      {/* Camera + Gallery hidden per product decision — code kept (not
          removed) in case they're re-enabled later. Only Location stays. */}
      {/* <Pressable
        style={({ pressed }) => [
          styles.attachmentOption,
          pressed && styles.sendPressed,
        ]}
        onPress={takePhoto}
      >
        <View style={styles.attachmentIcon}>
          <Camera
            color={colors.primary}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
        </View>

        <Text style={styles.attachmentLabel}>
          Camera
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.attachmentOption,
          pressed && styles.sendPressed,
        ]}
        onPress={pickImageFromGallery}
      >
        <View style={styles.attachmentIcon}>
          <ImageIcon
            color={colors.primary}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
        </View>

        <Text style={styles.attachmentLabel}>
          Gallery
        </Text>
      </Pressable> */}

      <Pressable
        style={({ pressed }) => [
          styles.attachmentOption,
          pressed && styles.sendPressed,
        ]}
        onPress={() => {
          setAttachmentMenuOpen(false);
          setLocationPickerOpen(true);
        }}
        disabled={isCapturingLocation}
      >
        <View style={styles.attachmentIcon}>
          {isCapturingLocation ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
          ) : (
            <MapPin
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
          )}
        </View>

        <Text style={styles.attachmentLabel}>
          Location
        </Text>
      </Pressable>
    </View>
  ) : null}

  <View style={[styles.composer, { backgroundColor: colors.bottomBar }]}>
        {sendError ? (
          <Text style={styles.sendErrorText} accessibilityLiveRegion="polite">
            {sendError}
          </Text>
        ) : null}
        {pendingReply ? (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyPreviewAccent} />
            {pendingReply.imageUrl ? (
              <Image
                source={{ uri: pendingReply.imageUrl }}
                style={styles.replyPreviewThumb}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.replyPreviewTextWrap}>
              <Text style={styles.replyPreviewAuthor} numberOfLines={1}>
                {pendingReply.authorName ?? 'Community member'}
              </Text>
              {/* Was capped to a single line, which silently clipped most
                  quoted messages behind "…" — now shows the full quote up
                  to a reasonable cap, same as WhatsApp's reply preview. */}
              <Text style={styles.replyPreviewBody} numberOfLines={4}>
                {pendingReply.body?.trim()
                  ? pendingReply.body
                  : pendingReply.imageUrl
                    ? 'Photo'
                    : 'Message'}
              </Text>
            </View>
            <Pressable
              onPress={cancelPendingReply}
              hitSlop={layout.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
              style={styles.replyPreviewCancel}
            >
              <X color={colors.textMuted} size={iconSize.sm} strokeWidth={iconStroke} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerRow}>

         
{/* 
          <Pressable
  onPress={() => setAttachmentMenuOpen(prev => !prev)}
  disabled={send.isPending}
  hitSlop={layout.hitSlop}
  style={({ pressed }) => [
    styles.locationPressable,
    send.isPending && styles.sendDisabled,
    pressed && !send.isPending && styles.sendPressed,
  ]}
  accessibilityRole="button"
  accessibilityLabel={
    attachmentMenuOpen
      ? 'Close attachment options'
      : 'Open attachment options'
  }
>
  {attachmentMenuOpen ? (
    <X
      color={colors.primary}
      size={iconSize.md}
      strokeWidth={iconStroke}
    />
  ) : (
    <Paperclip
      color={colors.primary}
      size={iconSize.md}
      strokeWidth={iconStroke}
    />
  )}
</Pressable> */}

{/* adds code 4 start */}
{isGroupThread ? (
  <Pressable
   onPress={openCreateCommunityPost}
    disabled={send.isPending}
    hitSlop={layout.hitSlop}
    style={({ pressed }) => [
      styles.addPostButton,
      send.isPending && styles.sendDisabled,
      pressed && !send.isPending && styles.sendPressed,
    ]}
    accessibilityRole="button"
    accessibilityLabel="Add Post"
  >
   <ImageIcon
  color={colors.primary}
  size={iconSize.md}
  strokeWidth={iconStroke}
/>
  </Pressable>
) : (
  <Pressable
    onPress={() => setAttachmentMenuOpen(prev => !prev)}
    disabled={send.isPending}
    hitSlop={layout.hitSlop}
    style={({ pressed }) => [
      styles.locationPressable,
      send.isPending && styles.sendDisabled,
      pressed && !send.isPending && styles.sendPressed,
    ]}
    accessibilityRole="button"
    accessibilityLabel={
      attachmentMenuOpen
        ? 'Close attachment options'
        : 'Open attachment options'
    }
  >
    {attachmentMenuOpen ? (
      <X
        color={colors.primary}
        size={iconSize.md}
        strokeWidth={iconStroke}
      />
    ) : (
      <Paperclip
        color={colors.primary}
        size={iconSize.md}
        strokeWidth={iconStroke}
      />
    )}
  </Pressable>
)}





          <TextInput
            ref={messageInputRef}
            value={draft}
            onChangeText={text => {
              setDraft(text);
              if (!text.trim()) {
                flushTypingStop();
                return;
              }
              // Emit `start` immediately on the first keystroke so the peer
              // sees the indicator in real time, then auto-`stop` after
              // TYPING_STOP_DEBOUNCE_MS of input inactivity.
              dispatchTypingStart();
            }}
            onBlur={() => flushTypingStop()}
           placeholder={
  typingName
    ? `${typingName} is typing…`
    : `Message ${displayTitle ?? '…'}`
}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
           multiline={false}
numberOfLines={1}
            blurOnSubmit={false}
            textAlignVertical="top"
            accessibilityLabel="Message text field"
          />
          <Pressable
            onPress={() => {
              const trimmed = draft.trim();
              if (!trimmed || send.isPending) {
                return;
              }
              send.mutate({
                body: trimmed,
                clientId: newClientMessageId(),
                ...(pendingReply ? { replyToCommunityMessage: pendingReply } : {}),
              });
              setPendingReply(null);
              flushTypingStop();
            }}
            hitSlop={layout.hitSlop}
            style={({ pressed }) => [
              styles.sendPressable,
              (!draft.trim() || send.isPending) && styles.sendDisabled,
              pressed && draft.trim() && !send.isPending && styles.sendPressed,
            ]}
            disabled={!draft.trim() || send.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() || send.isPending }}>
            <LinearGradient
              colors={colors.brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendGradient}>
              <Send
                color={colors.onBrandGradient}
                size={iconSize.md}
                strokeWidth={iconStroke}
              />
            </LinearGradient>
          </Pressable>
        </View>
        </View>
  </>
  )}
      </View>
      <LocationPickerModal
        visible={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSend={sendLocationMessage}
      />
      {peerUserIdForProfile ? (
        <ReportSheetModal
          visible={reportSheetOpen}
          onClose={() => setReportSheetOpen(false)}
          targetType="user"
          targetId={peerUserIdForProfile}
          targetLabel={displayTitle}
          blocksOnSubmit
          onSubmitted={() => setPeerBlocked(true)}
        />
      ) : null}
      <ActionMenu
        visible={chatMenuOpen}
        onClose={() => setChatMenuOpen(false)}
        anchor={chatMenuAnchor}
        items={chatMenuItems}
        align="right"
      />
      <ActionMenu
        visible={messageMenu !== null}
        onClose={() => setMessageMenu(null)}
        anchor={messageMenu?.anchor ?? null}
        items={messageMenuItems}
        align="right"
      />
      <ChatImageViewerModal
        imageUrl={viewerImageUrl}
        onClose={() => setViewerImageUrl(null)}
      />
    </SafeAreaView>
  );

  // `KeyboardAvoidingView` from `react-native-keyboard-controller` —
  // native-driven keyboard tracking (WindowInsetsAnimationCompat on
  // Android, `keyboardWillShow` on iOS). This is the pattern used by
  // Bluesky / Stream Chat / Rocket.Chat for chat composers; it works
  // reliably with new architecture + react-native-screens where the stock
  // RN `KeyboardAvoidingView` is known-broken. `translate-with-padding`
  // is the recommended behavior for chat — it preserves layout (no list
  // remeasure) and pushes the composer up via translation.
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="translate-with-padding"
      keyboardVerticalOffset={keyboardOffset}>
      {threadBody}
    </KeyboardAvoidingView>
  );
}

const buildStyles = () => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, backgroundColor: colors.background },
  /** Required so the list does not grow to full message height and shove the composer under the keyboard (especially Android + adjustResize). */
  listFlex: { flex: 1, backgroundColor: colors.background },
  list: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    gap: spacing.md,
    flexGrow: 1,
  },
  /** Inverted: extra space by the composer is `paddingTop` in coordinates (visual bottom). */
  listInverted: {
    paddingBottom: spacing.sm,
  },
  /** Non-inverted empty state: space above composer. */
  listNonInverted: {
    paddingTop: spacing.sm,
  },
  listEmptyCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  /** With `inverted`, footer renders at the visual top (older side of the thread). */
  listFooter: {
    marginBottom: spacing.lg,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  historyLoadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  contextBanner: {
    gap: spacing.sm,
  },
  contextLabel: {
    ...typography.overline,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  threadHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },

// adds code 3 start

groupAdArea: {
  flex: 1,
  minHeight: 0,
  paddingHorizontal:
    layout.screenPaddingHorizontal,
  paddingTop: spacing.sm,
  paddingBottom: spacing.xs,
},

groupAdList: {
  height: AD_CARD_HEIGHT,
  flexGrow: 0,
},

groupAdPage: {
  height: AD_CARD_HEIGHT,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
},

groupAdCard: {
  flex: 1,
  padding: spacing.sm,
  borderRadius: layout.radius.lg,
  backgroundColor: colors.surface,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  overflow: 'hidden',
},

groupAdHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.sm,
},

groupAdAdvertiserPressable: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  minWidth: 0,
},

groupAdHeaderText: {
  flex: 1,
  minWidth: 0,
},

groupAdAdvertiser: {
  ...typography.bodySmall,
  color: colors.textPrimary,
  fontWeight: '700',
},

groupAdTitle: {
  ...typography.caption,
  color: colors.textSecondary,
  marginTop: 1,
},

groupAdBadge: {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: layout.radius.sm,
  backgroundColor: colors.primarySoft,
},

groupAdBadgeText: {
  ...typography.caption,
  fontSize: 10,
  fontWeight: '700',
  color: colors.primary,
},

/** City badge + hours-left stacked on the card's right edge. */
groupAdMetaColumn: {
  alignItems: 'flex-end',
  gap: 2,
},

groupAdLocationBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  maxWidth: 110,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: layout.radius.sm,
  backgroundColor: colors.surfaceMuted,
},

groupAdLocationText: {
  ...typography.caption,
  fontSize: 10,
  fontWeight: '600',
  color: colors.textSecondary,
  flexShrink: 1,
},

groupAdTimeLeftText: {
  ...typography.caption,
  fontSize: 10,
  fontWeight: '600',
  color: colors.textMuted,
},

groupAdDescription: {
  ...typography.caption,
  color: colors.textSecondary,
  marginTop: spacing.xs,
  marginBottom: spacing.xs,
},

/**
 * Explicit pixel height — NOT `flex: 1`. A horizontal FlatList sizes rows
 * from their content, so a flex-only height collapses to zero here and the
 * photos never get any space to draw into.
 */
groupAdImageContainer: {
  height: AD_IMAGE_HEIGHT - 14,
  marginHorizontal: 8,
  borderRadius: layout.radius.md,
  backgroundColor: colors.surfaceMuted,
  overflow: 'hidden',
},

/** Holds the photo frame plus the tilted cards peeking out behind it. */
groupAdAlbumStage: {
  height: AD_IMAGE_HEIGHT,
  width: '100%',
  justifyContent: 'center',
},

/** Centres the closed-album stack inside the stage. */
groupAdCoverWrap: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

/** One print in the closed album: white border like a photo print. */
groupAdCoverCard: {
  position: 'absolute',
  width: '62%',
  height: '78%',
  borderRadius: layout.radius.sm,
  backgroundColor: colors.surface,
  borderWidth: 3,
  borderColor: colors.surface,
  overflow: 'hidden',
  ...Platform.select({
    android: { elevation: 3 },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
},

/** Every album photo is stacked in the same box and cross-faded. */
groupAdImageFrame: {
  ...StyleSheet.absoluteFill,
  width: '100%',
  height: '100%',
},

/** The <Image> inside the fading wrapper. */
groupAdImageFill: {
  width: '100%',
  height: '100%',
},

/** Left half = previous photo, right half = next photo. */
groupAdTapZones: {
  ...StyleSheet.absoluteFill,
  flexDirection: 'row',
},

groupAdTapZone: {
  flex: 1,
},

groupAdPhotoCounter: {
  position: 'absolute',
  top: spacing.xs,
  right: spacing.xs,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: layout.radius.sm,
  backgroundColor: 'rgba(0,0,0,0.45)',
},

groupAdPhotoCounterText: {
  ...typography.caption,
  fontSize: 10,
  fontWeight: '700',
  color: '#FFFFFF',
},

groupAdNoImage: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.surfaceMuted,
},

groupAdNoImageText: {
  ...typography.caption,
  color: colors.textMuted,
},

groupAdIndicatorRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: spacing.xs,
  paddingVertical: spacing.xs,
},

groupAdDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: colors.borderStrong,
},

groupAdDotActive: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.primary,
},

// adds code 3 end



  bubbleWrap: { maxWidth: '85%' },
  bubbleWrapMine: { alignSelf: 'flex-end' },
  bubbleWrapThem: { alignSelf: 'flex-start' },
  /** Forces the bubble to use most of its available width when it holds a
   *  quoted reply preview, instead of shrink-wrapping to a short reply's
   *  own text width (which otherwise crushes the quote into a narrow
   *  column of wrapped lines). */
  bubbleWrapWithQuote: { width: '85%' },
  /** Group chat author header: avatar + name above the first bubble in a run. */
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
    marginLeft: 4,
  },
  authorRowPressed: { opacity: 0.7 },
  author: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
    maxWidth: 200,
  },
  bubble: {
    borderRadius: layout.radius.lg,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  chatImage: {
  width: 240,
  height: 240,
  borderRadius: layout.radius.md,
},
bubbleImage: {
  padding: 4,
},
  /** When a location card is embedded, shrink bubble padding so the card
   *  reaches close to the bubble edge and the map preview reads as the
   *  primary content. */
  bubbleLocation: {
    padding: 4,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: layout.radius.sm,
    ...shadows.cardSubtle,
  },
  bubbleThem: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: layout.radius.sm,
    ...shadows.cardSubtle,
  },
  body: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodyMine: { color: colors.onPrimary },
  /** Optimistic-pending: dim the bubble subtly to communicate "in flight". */
  bubbleSending: { opacity: 0.7 },
  /** Failed send: red border on the bubble, retry control rendered next to the time. */
  bubbleFailed: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  bubbleMetaRowMine: { alignSelf: 'flex-end', marginRight: 4 },
  bubbleMetaRowThem: { alignSelf: 'flex-start', marginLeft: 4 },
  /** Wraps the delivery-tick icon (queued/sent/read) next to the timestamp. */
  tickRow: {
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRow: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  metaHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  metaError: {
    ...typography.caption,
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  metaRetry: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  systemWrap: {
    alignSelf: 'center',
    maxWidth: '92%',
    alignItems: 'center',
    gap: 6,
    marginVertical: spacing.xs,
  },
  systemBubble: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  systemText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  timeMuted: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTabInactive,
  },
  /** Full-width surface under the field so nothing below the input shows `background`. */
  composerDock: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  composer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  blockedBanner: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  blockedBannerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  blockedBannerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  blockedBannerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  blockedBannerBtnPrimary: {
    backgroundColor: colors.danger,
  },
  blockedBannerBtnLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  blockedBannerBtnPrimaryLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  sendErrorText: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  replyPreviewBar: {
    flexDirection: 'row',
    // Was 'center' — with the quote now allowed to wrap to several lines,
    // centering made the accent bar/thumbnail float oddly next to a tall
    // text block. 'flex-start' keeps them pinned to the top like WhatsApp.
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  replyPreviewAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  replyPreviewThumb: {
    width: 36,
    height: 36,
    borderRadius: layout.radius.sm,
  },
  replyPreviewTextWrap: {
    flex: 1,
    // Room for the cancel (X) button so long quoted text wraps around it
    // instead of running underneath.
    paddingRight: spacing.xs,
  },
  replyPreviewAuthor: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  replyPreviewBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  replyPreviewCancel: {
    padding: spacing.xs,
  },
  quoteBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: layout.radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  quoteBlockMine: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  quoteAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  quoteThumb: {
    width: 30,
    height: 30,
    borderRadius: layout.radius.sm,
  },
  quoteTextWrap: {
    flex: 1,
  },
  quoteAuthor: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  quoteBody: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  retryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.sm,
    backgroundColor: colors.tipBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tipBorder,
  },
  retryStripText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.tipText,
  },
  retryBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  retryBtnLarge: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.radius.full,
    backgroundColor: colors.primary,
    minWidth: 160,
    alignItems: 'center',
  },
  retryBtnLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  retryBtnLabelLight: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  stateBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    gap: spacing.md,
  },
  stateTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  emptyThread: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyThreadTitle: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  emptyThreadBody: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  sendPressable: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    overflow: 'hidden',
    /** Hairline highlight reads as a polished pill rim against dark canvas. */
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    ...shadows.button,
  },
  /** Plain-surface companion to sendPressable for the location-share affordance.
   *  Same touch target so the composer row stays visually balanced. */
  locationPressable: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  // adds code 5 start
 addPostButton: {
  width: layout.minTouchTarget,
  height: layout.minTouchTarget,
  borderRadius: layout.minTouchTarget / 2,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.primarySoft,
},

sendGradient: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

sendDisabled: {
  opacity: 0.38,
},

sendPressed: {
  opacity: 0.9,
},

// adds code 5 end

attachmentMenu: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: spacing.lg,
  paddingHorizontal: layout.screenPaddingHorizontal,
  paddingVertical: spacing.md,
  backgroundColor: colors.surface,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: colors.divider,
},

attachmentOption: {
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 72,
  gap: spacing.xs,
},

attachmentIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.primarySoft,
},

attachmentLabel: {
  ...typography.caption,
  fontSize: 12,
  fontWeight: '600',
  color: colors.textSecondary,
},

});














//comment data 1

// import { launchCamera, launchImageLibrary, PhotoQuality } from 'react-native-image-picker';
// import type { NativeBottomTabNavigationProp } from '@bottom-tabs/react-navigation';
// import { useHeaderHeight } from '@react-navigation/elements';
// import {
//   useIsFocused,
//   useNavigation,
//   useRoute,
//   type CompositeNavigationProp,
//   type RouteProp,
// } from '@react-navigation/native';
// import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import {
//   useInfiniteQuery,
//   useMutation,
//   useQuery,
//   useQueryClient,
//   type InfiniteData,
// } from '@tanstack/react-query';

// // import { MapPin, Send } from 'lucide-react-native';
// import {
//   Camera,
//   Image as ImageIcon,
//   MapPin,
//   Paperclip,
//   Send,
//   X,
// } from 'lucide-react-native';

// import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
// import {
//   ActivityIndicator,
//   AppState,
//    Alert,
//   FlatList,
//   Image,
//   Platform,
//     PermissionsAndroid,
//   Pressable,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
//   useWindowDimensions,
//   type ListRenderItem,
//   type NativeSyntheticEvent,
//   type NativeScrollEvent,
// } from 'react-native';
// import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
// import LinearGradient from 'react-native-linear-gradient';
// import {
//   SafeAreaView,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';
// //1
// import Clipboard from '@react-native-clipboard/clipboard';
// import {
//   createOrOpenDirectThread,
//   emitTypingStart,
//   emitTypingStop,
//   fetchMessagesPage,
//   fetchThreads,
//   getPresenceState,
//   errorMessage,
//   joinChatThreadSocket,
//   leaveChatThreadSocket,
//   markThreadRead,
//   newClientMessageId,
//   onIncomingChatMessage,
//   onMessageRead,
//   onPresenceUpdate,
//   onTypingUpdate,
//   sendChatMessage,
//   fetchCommunityPosts,
// } from '../../api/client';
// import { ChatListingAttachment } from '../../components/chat/ChatListingAttachment';
// import { ChatLocationAttachment } from '../../components/chat/ChatLocationAttachment';
// import { captureCurrentLocation, describeLocation } from '../../lib/shareLocation';
// // import {pickListingImages,takeChatPhoto,} from '../../lib/pickListingImages';
// import { uploadImageToCloudinary } from '../../lib/cloudinary';
// import {
//   navigateToChatsThread,
//   navigateToHomeStackScreen,
// } from '../../navigation/crossTabNavigate';
// import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
// import type { ChatListingRef, ChatMessage, ChatThread } from '../../types/models';
// import { useActiveChatThreadStore } from '../../stores/activeChatThreadStore';
// import { useAuthStore } from '../../stores/authStore';
// import { colors } from '../../theme/colors';
// import { iconSize, iconStroke } from '../../theme/icons';
// import { layout } from '../../theme/layout';
// import { shadows } from '../../theme/shadows';
// import { spacing } from '../../theme/spacing';
// import { typography } from '../../theme/typography';
// import { formatMessageTime } from '../../utils/formatChatTime';
// import {
//   flattenMessagePages,
//   mapMessagesInInfinitePages,
//   markMessageClientStatusInPages,
//   mergeIncomingIntoMessagesInfinite,
//   type MessagesPageResult,
// } from '../../chat/messagePages';
// import { sameId } from '../../chat/threadUnread';


// type Route = RouteProp<MainStackParamList, 'ChatThread'>;

// type Nav = CompositeNavigationProp<
//   NativeStackNavigationProp<MainStackParamList, 'ChatThread'>,
//   NativeBottomTabNavigationProp<MainTabParamList>
// >;

// /** Auto-clear a peer's "typing…" indicator after this long with no fresh
//  *  `typing:update` event — guards against missed `stop` events. */
// const TYPING_RECEIVE_TTL_MS = 4000;

// /** Local debounce: emit `typing:stop` after this long of input inactivity. */
// const TYPING_STOP_DEBOUNCE_MS = 1500;

// /** Must stay ≤ backend PaginationQueryDto max (100). */
// const MESSAGE_PAGE_SIZE = 50;

// const chatThreadNavTitleStyles = StyleSheet.create({
//   wrap: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     // Bound the title so a long thread name doesn't push against the header
//     // edges and break the centered alignment.
//     maxWidth: 220,
//     paddingHorizontal: spacing.xs,
//   },
//   title: {
//     ...typography.headline,
//     fontSize: 16,
//     lineHeight: 20,
//     color: colors.textPrimary,
//     fontWeight: '700',
//     textAlign: 'center',
//   },
//   subtitle: {
//     ...typography.caption,
//     fontSize: 12,
//     lineHeight: 16,
//     color: colors.textSecondary,
//     textAlign: 'center',
//   },
// });

// function ChatThreadNavTitle({
//   title,
//   statusLabel,
// }: {
//   title: string;
//   statusLabel: string;
// }) {
//   return (
//     <View style={chatThreadNavTitleStyles.wrap}>
//       <Text numberOfLines={1} style={chatThreadNavTitleStyles.title}>
//         {title}
//       </Text>
//       <Text numberOfLines={1} style={chatThreadNavTitleStyles.subtitle}>
//         {statusLabel}
//       </Text>
//     </View>
//   );
// }

// function getInitials(name: string): string {
//   const parts = name.trim().split(/\s+/).filter(Boolean);
//   if (parts.length === 0) {
//     return '?';
//   }
//   if (parts.length === 1) {
//     return parts[0].slice(0, 2).toUpperCase();
//   }
//   return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
// }

// /**
//  * Avatar circle for the message sender. Renders the user's photo when
//  * available, otherwise a colored circle with their initials so group-chat
//  * messages always have a visual identifier.
//  */
// function SenderAvatar({
//   avatarUrl,
//   name,
// }: {
//   avatarUrl?: string;
//   name: string;
// }) {
//   const [failed, setFailed] = React.useState(false);
//   if (avatarUrl && !failed) {
//     return (
//       <Image
//         source={{ uri: avatarUrl }}
//         style={senderAvatarStyles.image}
//         onError={() => setFailed(true)}
//         accessibilityIgnoresInvertColors
//       />
//     );
//   }
//   return (
//     <View style={senderAvatarStyles.fallback}>
//       <Text style={senderAvatarStyles.initials}>{getInitials(name)}</Text>
//     </View>
//   );
// }

// const senderAvatarStyles = StyleSheet.create({
//   image: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: colors.surfaceMuted,
//   },
//   fallback: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: colors.primarySoft,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   initials: {
//     ...typography.caption,
//     fontSize: 10,
//     fontWeight: '700',
//     color: colors.primary,
//   },
// });



// // adds code 1 start

// type GroupAd = {
//   id: string;
//   userId: string;

//   title: string;
//   description: string;
//   city?: string;

//   images: string[];

//   createdAt: string;
//   updatedAt: string;

//   // Comes from the existing chat message author
//   advertiserName: string;
//   advertiserAvatar?: string;
// };


// function GroupAdsCarousel({
//   ads,
//   onAdvertiserPress,
// }: {
//   ads: GroupAd[];
//   // Tapping the advertiser's icon or name should open a direct chat
//   // with that user, with the ad copied along as the related listing.
//   onAdvertiserPress?: (ad: GroupAd) => void;
// }) {
//   const { width: screenWidth } = useWindowDimensions();

//   const validAds = useMemo(
//     () =>
//       ads.filter(
//         ad =>
//           ad.images &&
//           ad.images.length > 0 &&
//           ad.title?.trim(),
//       ),
//     [ads],
//   );

//   const [adIndex, setAdIndex] = React.useState(0);
//   const [imageIndex, setImageIndex] = React.useState(0);

//   const adListRef = React.useRef<FlatList<GroupAd>>(null);

//   /*
//    * IMPORTANT:
//    * Hooks must always run in the same order.
//    * So useCallback/useEffect must NOT come after
//    * an early return.
//    */

//   const goToAd = useCallback(
//     (nextIndex: number) => {
//       if (validAds.length === 0) {
//         return;
//       }

//       const safeIndex =
//         (nextIndex + validAds.length) % validAds.length;

//       setAdIndex(safeIndex);
//       setImageIndex(0);

//       adListRef.current?.scrollToIndex({
//         index: safeIndex,
//         animated: true,
//       });
//     },
//     [validAds.length],
//   );

//   /*
//    * Current ad safely calculate karo.
//    *
//    * Jab validAds empty ho to currentAd undefined hoga.
//    */
//   const currentAd = validAds[adIndex];

//   // ================================
//   // AUTO IMAGE / AUTO AD
//   // ================================

//   React.useEffect(() => {
//     // Ads available nahi hain to kuch mat karo
//     if (!currentAd) {
//       return;
//     }

//     const timer = setTimeout(() => {
//       // Current ad ki next image
//       if (
//         imageIndex <
//         currentAd.images.length - 1
//       ) {
//         setImageIndex(previous => previous + 1);

//         return;
//       }

//       // Current ad ki sari images complete
//       // Ab next ad
//       goToAd(adIndex + 1);
//     }, 3000);

//     return () => {
//       clearTimeout(timer);
//     };
//   }, [
//     adIndex,
//     imageIndex,
//     currentAd,
//     goToAd,
//   ]);

//   /*
//    * Ab saare hooks call ho chuke hain.
//    * Iske baad early return safe hai.
//    */
//   if (validAds.length === 0 || !currentAd) {
//     return null;
//   }

//   return (
//     <FlatList
//       ref={adListRef}
//       data={validAds}
//       horizontal
//       pagingEnabled
//       showsHorizontalScrollIndicator={false}
//       bounces={false}
//       decelerationRate="fast"
//       snapToAlignment="start"
//       keyExtractor={item => item.id}
//       style={styles.groupAdList}
//       getItemLayout={(_, index) => ({
//         length: screenWidth,
//         offset: screenWidth * index,
//         index,
//       })}

//       renderItem={({ item, index }) => {
//         const isCurrentAd =
//           index === adIndex;

//         const activeImageIndex =
//           isCurrentAd
//             ? imageIndex
//             : 0;

//         return (
//           <View
//             style={[
//               styles.groupAdPage,
//               {
//                 width: screenWidth,
//               },
//             ]}
//           >
//             <View
//               style={styles.groupAdCard}
//             >

//               {/* ================= */}
//               {/* ADVERTISER */}
//               {/* ================= */}

//               <View style={styles.groupAdHeader}>
//                 <Pressable
//                   style={styles.groupAdAdvertiserPressable}
//                   onPress={() => onAdvertiserPress?.(item)}
//                   hitSlop={6}
//                   accessibilityRole="button"
//                   accessibilityLabel={`Message ${item.advertiserName} about ${item.title}`}
//                 >
//                   <SenderAvatar
//                     avatarUrl={
//                       item.advertiserAvatar
//                     }
//                     name={item.advertiserName}
//                   />

//                   <View style={styles.groupAdHeaderText}>
//                     <Text
//                       style={styles.groupAdAdvertiser}
//                       numberOfLines={1}
//                     >
//                       {item.advertiserName}
//                     </Text>

//                     <Text
//                       style={styles.groupAdTitle}
//                       numberOfLines={1}
//                     >
//                       {item.title}
//                     </Text>
//                   </View>
//                 </Pressable>

//                 <View style={styles.groupAdBadge}>
//                   <Text style={styles.groupAdBadgeText}>
//                     Ad
//                   </Text>
//                 </View>
//               </View>

//               {/* ================= */}
//               {/* DESCRIPTION */}
//               {/* ================= */}

//               <Text
//                 style={styles.groupAdDescription}
//                 numberOfLines={2}
//               >
//                 {item.description}
//               </Text>

//               {/* ================= */}
//               {/* MAIN IMAGE */}
//               {/* ================= */}

//               <View
//                 style={styles.groupAdImageContainer}
//               >
//                 {item.images?.length > 0 ? (
//                   <Image
//                     source={{
//                       uri:
//                         item.images[activeImageIndex] ??
//                         item.images[0],
//                     }}
//                     style={styles.groupAdImage}
//                     resizeMode="contain"
//                   />
//                 ) : (
//                   <View style={styles.groupAdNoImage}>
//                     <Text style={styles.groupAdNoImageText}>
//                       No image
//                     </Text>
//                   </View>
//                 )}
//               </View>

//               {/* ================= */}
//               {/* THUMBNAILS */}
//               {/* ================= */}

//               <View
//                 style={styles.groupAdThumbnailsRow}
//               >
//                 {(item.images ?? []).map(
//                   (
//                     image,
//                     pictureIndex,
//                   ) => (
//                     <Pressable
//                       key={`${item.id}-thumb-${pictureIndex}`}
//                       onPress={() => {
//                         if (isCurrentAd) {
//                           setImageIndex(
//                             pictureIndex,
//                           );
//                         }
//                       }}
//                       style={[
//                         styles.groupAdThumbnailWrap,

//                         pictureIndex ===
//                           activeImageIndex &&
//                           styles.groupAdThumbnailActive,
//                       ]}
//                     >
//                       <Image
//                         source={{
//                           uri: image,
//                         }}
//                         style={
//                           styles.groupAdThumbnail
//                         }
//                         resizeMode="cover"
//                       />
//                     </Pressable>
//                   ),
//                 )}
//               </View>

//               {/* ================= */}
//               {/* AD DOTS */}
//               {/* ================= */}

//               <View
//                 style={
//                   styles.groupAdIndicatorRow
//                 }
//               >
//                 {validAds.map(
//                   (_, dotIndex) => (
//                     <View
//                       key={`ad-dot-${dotIndex}`}
//                       style={[
//                         styles.groupAdDot,

//                         dotIndex ===
//                           adIndex &&
//                           styles.groupAdDotActive,
//                       ]}
//                     />
//                   ),
//                 )}
//               </View>

//             </View>
//           </View>
//         );
//       }}

//       // ================================
//       // MANUAL AD SWIPE
//       // ================================

//       onMomentumScrollEnd={event => {
//         const pageWidth =
//           event.nativeEvent
//             .layoutMeasurement
//             .width;

//         if (!pageWidth) {
//           return;
//         }

//         const nextAdIndex =
//           Math.round(
//             event.nativeEvent
//               .contentOffset.x /
//               pageWidth,
//           );

//         if (
//           nextAdIndex !== adIndex
//         ) {
//           setAdIndex(
//             nextAdIndex,
//           );

//           // Manual swipe ke baad
//           // new ad first image se start
//           setImageIndex(0);
//         }
//       }}
//     />
//   );
// }
// // adds code 1 end



// export function ChatThreadScreen() {
//   const route = useRoute<Route>();
//   const navigation = useNavigation<Nav>();
//   const isFocused = useIsFocused();
//   const headerHeight = useHeaderHeight();
//   const insets = useSafeAreaInsets();
//   const { threadId, title, relatedListing: paramListing } = route.params;
//   const user = useAuthStore(s => s.user);
//   const setActiveThreadId = useActiveChatThreadStore(s => s.setActiveThreadId);
//   const queryClient = useQueryClient();
//   const [draft, setDraft] = React.useState('');
//   const [typingName, setTypingName] = React.useState<string | null>(null);
//   const [peerOnline, setPeerOnline] = React.useState<boolean | null>(null);
//   const [sendError, setSendError] = React.useState<string | null>(null);
//   const [isSendingImage, setIsSendingImage] = React.useState(false);
//   const [attachmentMenuOpen, setAttachmentMenuOpen] = React.useState(false);
//   const listRef = useRef<FlatList<ChatMessage>>(null);
//   const messageInputRef = useRef<TextInput>(null);
//   /**
//    * Inverted list: small `contentOffset.y` ⇒ user is viewing the newest messages
//    * (same idea as WhatsApp — no scrollToEnd on open).
//    */
//   const nearNewestRef = useRef(true);




//   /** Mounted stack screens beneath a pushed ChatThread stay mounted but unfocused — never mark-read for those. */
//   const isScreenFocusedRef = useRef(isFocused);
//   React.useEffect(() => {
//     isScreenFocusedRef.current = isFocused;
//   }, [isFocused]);
//   const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);



//     const threadsQuery = useQuery({
//     queryKey: ['threads', user?.id],
//     queryFn: () => fetchThreads(user!),
//     enabled: !!user,
//     select: list => list.find(t => sameId(t.id, threadId)),
//   });

//   const isGroupThread = threadsQuery.data?.type === 'group';
  
//   // commnity name change 
//  const displayTitle =threadsQuery.data?.type === 'group'? 'Real Estate Community': title;
//   const relatedListing = useMemo(
//     () => paramListing ?? threadsQuery.data?.relatedListing,
//     [paramListing, threadsQuery.data?.relatedListing],
//   );

//   const messagesQuery = useInfiniteQuery({
//     queryKey: ['messages', threadId, user?.id],
//     queryFn: ({ pageParam }) =>
//       fetchMessagesPage(threadId, user!, pageParam as number, MESSAGE_PAGE_SIZE),
//     initialPageParam: 1,
//     getNextPageParam: lastPage =>
//       lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
//     enabled: !!user,
//     retry: 2,
//   });

//   /**
//    * Pin `activeThreadId` synchronously (`useLayoutEffect`) before paint — a late
//    * `useEffect` left tabs summing unread for the open chat for one frame (badge "1").
//    * AppState listener keeps foreground/background in sync.
//    */
//   const syncActiveConversationPins = useCallback(() => {
//     if (!isFocused) {
//       setActiveThreadId(prev => (sameId(prev, threadId) ? null : prev));
//       return;
//     }
//     const state = AppState.currentState;
//     if (state === 'background') {
//       setActiveThreadId(prev => (sameId(prev, threadId) ? null : prev));
//       return;
//     }
//     setActiveThreadId(threadId);
//   }, [isFocused, setActiveThreadId, threadId]);

//   useLayoutEffect(() => {
//     syncActiveConversationPins();
//   }, [syncActiveConversationPins]);

//   useEffect(() => {
//     const appSub = AppState.addEventListener('change', syncActiveConversationPins);
//     return () => {
//       appSub.remove();
//     };
//   }, [syncActiveConversationPins]);

//   const data = useMemo(
//     () => flattenMessagePages(messagesQuery.data),
//     [messagesQuery.data],
//   );

//   /** Newest first — matches `inverted` so latest messages are at the composer without scrolling. */
//   const listData = useMemo(() => [...data].reverse(), [data]);

//   const pinToLatest = useCallback(
//     (animated: boolean) => {
//       if (!listRef.current || listData.length === 0) {
//         return;
//       }
//       requestAnimationFrame(() =>
//         listRef.current?.scrollToOffset({ offset: 0, animated }),
//       );
//     },
//     [listData.length],
//   );

//   const onScroll = useCallback(
//     (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//       const y = e.nativeEvent.contentOffset.y;
//       if (listData.length === 0) {
//         nearNewestRef.current = true;
//         return;
//       }
//       nearNewestRef.current = y < 120;
//     },
//     [listData.length],
//   );

//   /** Whether we've emitted `typing:start` and not yet emitted `typing:stop`.
//    *  Tracked locally so we don't spam `start` on every keystroke. */
//   const isTypingRef = useRef(false);
//   /** TTL timer for the peer's `typing…` indicator — cleared on every fresh
//    *  `typing:update`, fires to auto-clear if `stop` is ever missed. */
//   const typingReceiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
//     null,
//   );

//   const upsertMessage = useCallback(
//     (message: ChatMessage) => {
//       queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
//         ['messages', threadId, user?.id],
//         prev => mergeIncomingIntoMessagesInfinite(prev, message),
//       );
//     },
//     [queryClient, threadId, user?.id],
//   );

//   const markMessageStatus = useCallback(
//     (clientId: string, status: 'sending' | 'sent' | 'failed') => {
//       queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
//         ['messages', threadId, user?.id],
//         prev => markMessageClientStatusInPages(prev, clientId, status),
//       );
//     },
//     [queryClient, threadId, user?.id],
//   );

// const send = useMutation({
//   mutationFn: ({
//     body,
//     clientId,
//     locationContext,
//     imageUrl,
//   }: {
//     body: string;
//     clientId: string;
//     locationContext?: ChatMessage['locationContext'];
//     imageUrl?: string;
//   }) =>
//     sendChatMessage(
//       threadId,
//       user!,
//       body,
//       clientId,
//       locationContext,
//       imageUrl,
//     ),

//   onMutate: ({ body, clientId, locationContext, imageUrl }) => {
//     setSendError(null);

//     if (user) {
//       upsertMessage({
//         id: `optimistic-${clientId}`,
//         threadId,
//         authorId: user.id,
//         authorName: user.displayName,
//          authorAvatarUrl: user.avatarUrl,
//         body: body.trim(),
//         createdAt: new Date().toISOString(),
//         clientId,
//         status: 'sending',

//         ...(locationContext ? { locationContext } : {}),
//         ...(imageUrl ? { imageUrl } : {}),
//       });

//       queryClient.setQueryData<ChatThread[] | undefined>(
//         ['threads', user.id],
//         prev =>
//           (prev ?? []).map(t =>
//             sameId(t.id, threadId)
//               ? { ...t, unreadCount: 0 }
//               : t,
//           ),
//       );
//     }

//     nearNewestRef.current = true;
//     pinToLatest(true);

//     return { clientId };
//   },

//   onSuccess: message => {
//     setDraft('');

//     upsertMessage({
//       ...message,
//       status: 'sent',
//     });

//     pinToLatest(true);

//     requestAnimationFrame(() => {
//       messageInputRef.current?.focus();
//     });
//   },

//   onError: (err, _vars, context) => {
//     if (context?.clientId) {
//       markMessageStatus(
//         context.clientId,
//         'failed',
//       );
//     }

//     setSendError(
//       errorMessage(
//         err,
//         'Could not send message',
//       ),
//     );
//   },
// });

//   const flushTypingStop = useCallback(() => {
//     if (typingDebounceRef.current) {
//       clearTimeout(typingDebounceRef.current);
//       typingDebounceRef.current = null;
//     }
//     if (isTypingRef.current) {
//       isTypingRef.current = false;
//       emitTypingStop(threadId);
//     }
//   }, [threadId]);

//   const dispatchTypingStart = useCallback(() => {
//     if (!isTypingRef.current) {
//       isTypingRef.current = true;
//       emitTypingStart(threadId);
//     }
//     // Reset the inactivity timer — peer sees `typing` until we go quiet for
//     // TYPING_STOP_DEBOUNCE_MS, then we send `stop`.
//     if (typingDebounceRef.current) {
//       clearTimeout(typingDebounceRef.current);
//     }
//     typingDebounceRef.current = setTimeout(() => {
//       typingDebounceRef.current = null;
//       isTypingRef.current = false;
//       emitTypingStop(threadId);
//     }, TYPING_STOP_DEBOUNCE_MS);
//   }, [threadId]);

//   const retryFailedMessage = useCallback(
//     (failed: ChatMessage) => {
//       if (!user) {
//         return;
//       }
//       // Reuse the original clientId so the server dedupes against any
//       // orphaned earlier row; only synthesize a new one for messages that
//       // somehow never had one (legacy data, mock-mode rows).
//       const clientId = failed.clientId ?? newClientMessageId();
//       markMessageStatus(clientId, 'sending');
//       send.mutate({ body: failed.body, clientId });
//     },
//     [markMessageStatus, send, user],
//   );

//   React.useEffect(() => {
//     nearNewestRef.current = true;
//     return () => {
//       // Component unmount: stop typing, leave the room (so the server can
//       // free it and we don't keep collecting events for an unmounted screen).
//       flushTypingStop();
//       if (typingReceiveTimeoutRef.current) {
//         clearTimeout(typingReceiveTimeoutRef.current);
//         typingReceiveTimeoutRef.current = null;
//       }
//       void leaveChatThreadSocket(threadId);
//     };
//   }, [threadId, flushTypingStop]);

//   const statusLabel =
//     threadsQuery.data?.type === 'direct'
//       ? peerOnline === null
//         ? 'Checking status...'
//         : peerOnline
//           ? 'Online'
//           : 'Offline'
//       : 'Group chat';

//   React.useLayoutEffect(() => {
//     navigation.setOptions({
//       // React Navigation passes headerTitle as a render function; inner UI is a stable module component.
//       // eslint-disable-next-line react/no-unstable-nested-components -- RN headerTitle API
//       headerTitle: () => (
//   <ChatThreadNavTitle
//     title={displayTitle ?? '…'}
//     statusLabel={statusLabel}
//   />
// ),
//     });
//   }, [navigation, statusLabel, displayTitle]);

//   React.useEffect(() => {
//     if (!user?.id) {
//       return;
//     }
//     // Optimistic local clear so the unread badge disappears immediately when
//     // the screen mounts. The server-authoritative reset happens via
//     // `joinChatThreadSocket` → `thread:join` (server marks read + broadcasts
//     // `thread:update`) so the cache will be reconciled by AppProviders.
//     queryClient.setQueryData(
//       ['threads', user?.id],
//       (prev: {
//         id: string;
//         unreadCount?: number;
//       }[] | undefined) =>
//         (prev ?? []).map((thread) =>
//           sameId(thread.id, threadId) ? { ...thread, unreadCount: 0 } : thread,
//         ),
//     );

//     // `joinChatThreadSocket` emits `thread:join`, which the server uses to
//     // mark unread=0 *and* broadcast a read receipt to peers. Don't double up
//     // with a separate `markThreadRead` here — the server already does both.
//     void joinChatThreadSocket(threadId);

//     // `message:new` cache merge is owned by `subscribeChatRealtimeSync` so
//     // background threads stay in sync. Here we only mark peer messages read
//     // when this thread screen is focused AND the app is foreground: a screen
//     // can stay mounted under another pushed ChatThread; AppState.active alone
//     // would wrongly clear unread for the thread underneath.
//     const offMessage = onIncomingChatMessage(message => {
//       if (!sameId(message.threadId, threadId)) {
//         return;
//       }
//       if (message.authorId === user?.id) {
//         return;
//       }
//       if (!isScreenFocusedRef.current) {
//         return;
//       }
//       if (AppState.currentState !== 'active') {
//         return;
//       }
//       void markThreadRead(threadId);
//     });

//     return () => {
//       offMessage();
//     };
//   }, [queryClient, threadId, user?.id]);

//   React.useEffect(() => {
//     const offTyping = onTypingUpdate(payload => {
//       if (
//         !sameId(payload.threadId, threadId) ||
//         payload.userId === user?.id
//       ) {
//         return;
//       }
//       if (typingReceiveTimeoutRef.current) {
//         clearTimeout(typingReceiveTimeoutRef.current);
//         typingReceiveTimeoutRef.current = null;
//       }
//       if (payload.isTyping) {
//         setTypingName(payload.userName);
//         // Self-clear in case `typing:stop` is dropped (network glitch, peer
//         // app crash, etc.) — without this the indicator could stick forever.
//         typingReceiveTimeoutRef.current = setTimeout(() => {
//           typingReceiveTimeoutRef.current = null;
//           setTypingName(null);
//         }, TYPING_RECEIVE_TTL_MS);
//       } else {
//         setTypingName(null);
//       }
//     });
//     const offPresence = onPresenceUpdate(payload => {
//       const peerId = threadsQuery.data?.peerUserId;
//       if (peerId && payload.userId === peerId) {
//         setPeerOnline(payload.isOnline);
//       }
//     });
//     const offRead = onMessageRead(payload => {
//       if (
//         !sameId(payload.threadId, threadId) ||
//         payload.userId === user?.id
//       ) {
//         return;
//       }
//       // Mark the user's own previously-sent messages as read up to readAt.
//       // We don't surface a per-message tick yet; this just keeps the cache
//       // honest so a future "Read at HH:MM" footer can use it.
//       queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
//         ['messages', threadId, user?.id],
//         prev =>
//           mapMessagesInInfinitePages(prev, m =>
//             m.authorId === user?.id && m.status !== 'failed'
//               ? { ...m, status: 'sent' }
//               : m,
//           ),
//       );
//     });
//     const peerId = threadsQuery.data?.peerUserId;
//     if (peerId) {
//       setPeerOnline(getPresenceState(peerId).isOnline);
//     }
//     return () => {
//       offTyping();
//       offPresence();
//       offRead();
//     };
//   }, [queryClient, threadId, user?.id, threadsQuery.data?.peerUserId]);

//   const openListing = (propertyId: string) => {
//     navigateToHomeStackScreen(navigation, 'PropertyDetail', { propertyId });
//   };

//   const [isCapturingLocation, setIsCapturingLocation] = React.useState(false);







//   const shareCurrentLocation = useCallback(async () => {
//     if (!user || isCapturingLocation || send.isPending) {
//       return;
//     }
//     setAttachmentMenuOpen(false);
//     setIsCapturingLocation(true);
//     setSendError(null);
//     try {
//       const location = await captureCurrentLocation();
//       // Body doubles as the inbox preview text — use the address (or
//       // coordinates) so threads list shows "📍 …" instead of an empty row.
//       const body = `📍 ${describeLocation(location)}`;
//       send.mutate({
//         body,
//         clientId: newClientMessageId(),
//         locationContext: location,
//       });
//       flushTypingStop();
//     } catch (err) {
//       setSendError(errorMessage(err, 'Could not share your location'));
//     } finally {
//       setIsCapturingLocation(false);
//     }
//   }, [flushTypingStop, isCapturingLocation, send, user]);


// const sendChatImage = useCallback(
//   async (uri: string) => {
//     if (!user || isSendingImage || send.isPending) {
//       return;
//     }

//     setIsSendingImage(true);
//     setSendError(null);

//     try {
//       // 1. Upload local image to Cloudinary
//       const imageUrl = await uploadImageToCloudinary(uri);

//       console.log('Cloudinary image URL:', imageUrl);

//       // 2. Send Cloudinary URL through chat
//       send.mutate({
//         body: '📷 Photo',
//         clientId: newClientMessageId(),
//         imageUrl,
//       });

//       flushTypingStop();
//     } catch (err) {
//       setSendError(
//         errorMessage(
//           err,
//           'Could not upload and send image',
//         ),
//       );
//     } finally {
//       setIsSendingImage(false);
//     }
//   },
//   [
//     user,
//     isSendingImage,
//     send,
//     flushTypingStop,
//   ],
// );



//   //image picker

// const pickImageFromGallery = useCallback(async () => {
//   if (!user || send.isPending || isSendingImage) {
//     return;
//   }

//   setAttachmentMenuOpen(false);
//   setSendError(null);

//  try {
//   const result = await launchImageLibrary({
//     mediaType: 'photo',
//     selectionLimit: 1,
//     quality: 0.85 as PhotoQuality,
//   });

//     if (result.didCancel) {
//       return;
//     }

//     if (result.errorCode) {
//       setSendError(
//         result.errorMessage ?? 'Could not open gallery',
//       );
//       return;
//     }

//     const asset = result.assets?.[0];

//     if (!asset?.uri) {
//       return;
//     }

//     // Upload to Cloudinary and send chat message
//     await sendChatImage(asset.uri);
//   } catch (err) {
//     setSendError(
//       errorMessage(
//         err,
//         'Could not select image',
//       ),
//     );
//   }
// }, [
//   user,
//   send.isPending,
//   isSendingImage,
//   sendChatImage,
// ]);


// const requestCameraPermission = async (): Promise<boolean> => {
//   if (Platform.OS !== 'android') {
//     return true;
//   }

//   const permission = await PermissionsAndroid.request(
//     PermissionsAndroid.PERMISSIONS.CAMERA,
//     {
//       title: 'Camera Permission',
//       message: 'This app needs camera permission to take photos.',
//       buttonPositive: 'Allow',
//       buttonNegative: 'Cancel',
//     },
//   );

//   return permission === PermissionsAndroid.RESULTS.GRANTED;
// };




// //camera take photo
// const takePhoto = useCallback(async () => {
//   if (!user || send.isPending || isSendingImage) {
//     return;
//   }

//   setAttachmentMenuOpen(false);
//   setSendError(null);

//   try {
//     // Request camera permission before opening camera
//     const hasPermission = await requestCameraPermission();

//     if (!hasPermission) {
//       setSendError('Camera permission is required to take a photo.');
//       return;
//     }

//     const result = await launchCamera({
//       mediaType: 'photo',
//       cameraType: 'back',
//     quality: 0.85 as PhotoQuality,
//       saveToPhotos: false,
//     });

//     if (result.didCancel) {
//       return;
//     }

//     if (result.errorCode) {
//       setSendError(
//         result.errorMessage ?? 'Could not open camera',
//       );
//       return;
//     }

//     const asset = result.assets?.[0];

//     if (!asset?.uri) {
//       setSendError('No photo was captured.');
//       return;
//     }

//     await sendChatImage(asset.uri);
//   } catch (err) {
//     console.error('Camera error:', err);

//     setSendError(
//       errorMessage(
//         err,
//         'Could not capture image',
//       ),
//     );
//   }
// }, [
//   user,
//   send.isPending,
//   isSendingImage,
//   sendChatImage,
// ]);



// const openDirectWithUser = useCallback(
//   async (
//     peerUserId: string,
//     peerName: string,
//     listing?: ChatListingRef,
//   ) => {
//     if (!user || peerUserId === user.id) {
//       return;
//     }

//     try {
//       const thread = await createOrOpenDirectThread(
//         peerName,
//         peerUserId,
//       );

//       queryClient.setQueryData<ChatThread[] | undefined>(
//         ['threads', user.id],
//         prev => {
//           const list = prev ?? [];

//           const idx = list.findIndex(
//             t => sameId(t.id, thread.id),
//           );

//           const updatedThread = {
//             ...thread,
//             relatedListing:
//               listing ?? thread.relatedListing,
//           };

//           if (idx >= 0) {
//             const next = [...list];
//             next[idx] = {
//               ...next[idx],
//               ...updatedThread,
//             };
//             return next;
//           }

//           return [updatedThread, ...list];
//         },
//       );

//       queryClient.invalidateQueries({
//         queryKey: ['threads', user.id],
//       });

//       navigateToChatsThread(navigation, {
//         threadId: thread.id,
//         title: thread.title,
//         relatedListing:
//           listing ?? thread.relatedListing,
//       });
//     } catch (err) {
//       setSendError(
//         errorMessage(err, 'Could not open chat'),
//       );
//     }
//   },
//   [navigation, queryClient, user],
// );
//   // Tapping an ad's advertiser icon/name: open (or jump to) the direct
//   // chat with that user, with the ad copied along as the chat's related
//   // listing — same as tapping a listing card elsewhere in the thread.
//   const openAdvertiserChatFromAd = useCallback(
//     (ad: GroupAd) => {
//       if (!ad.userId) {
//         return;
//       }
//       const listingRef: ChatListingRef = {
//         id: ad.id,
//         title: ad.title,
//         imageUrl: ad.images?.[0] ?? '',
//         location: ad.city ?? '',
//         priceMonthly: 0,
//       };
//       openDirectWithUser(ad.userId, ad.advertiserName, listingRef);
//     },
//     [openDirectWithUser],
//   );

//   const listHeader = relatedListing ? (
//     <View style={styles.contextBanner}>
//       <Text style={styles.contextLabel}>Discussing</Text>
//       <ChatListingAttachment
//         listing={relatedListing}
//         onPress={() => openListing(relatedListing.id)}
//       />
//       <Text style={styles.threadHint}>
//         Tap the card to open the full listing.
//       </Text>
//     </View>
//   ) : null;

//   // Group threads need to identify the sender on every author switch. Direct
//   // threads don't (the header already names the peer). Default to direct
//   // until the thread query resolves so a flicker can't briefly show the name.
// // ============================================================
// // COMMUNITY CHAT USERS
// // Reuse the SAME name + avatar that is already used by chat
// // messages. We do not fetch/store another user profile here.
// // ============================================================


// // ============================================================
// // COMMUNITY ADS
// //
// // We DO NOT fetch another user/profile API here.
// //
// // The chat backend already gives us:
// //   authorId
// //   authorName
// //   authorAvatarUrl
// //
// // We reuse that SAME data for the advertiser.
// // post.userId is matched with message.authorId.
// // ============================================================
// const communityPostsQuery = useQuery({
//   queryKey: ['community-posts'],
//   queryFn: fetchCommunityPosts,
//   enabled: isGroupThread,

//   select: posts =>
//     posts
//       .filter(
//         post =>
//           Array.isArray(post.images) &&
//           post.images.length > 0 &&
//           post.title?.trim(),
//       )
//       .map(post => ({
//         id: post.id,
//         userId: post.userId,
//         title: post.title,
//         description: post.description,
//         city: post.city,
//         images: post.images,
//         createdAt: post.createdAt,
//         updatedAt: post.updatedAt,

//         // Same user record that backend uses for chat users.
//         advertiserName: post.authorName ?? 'User',
//         advertiserAvatar:
//           post.authorAvatarUrl ?? undefined,
//       })),
// });

//   //add navigatoin to post add
//     const openCreateCommunityPost = useCallback(() => {
//   if (!isGroupThread) {
//     return;
//   }
//   navigation.navigate('CreateCommunityPost');
// }, [isGroupThread, navigation]);

// //end


// //2
// const handleMessageLongPress = useCallback((item: ChatMessage) => {
//   Alert.alert(
//     'Message options',
//     undefined,
//     [
//       {
//         text: 'Unsend',
//         onPress: () => {
//           // TODO: Backend action later
//         },
//       },
//       {
//         text: 'Delete',
//         onPress: () => {
//           // TODO: Backend action later
//         },
//       },
//       {
//         text: 'Copy',
//         onPress: () => {
//           if (item.body?.trim()) {
//             Clipboard.setString(item.body);
//           }
//         },
//       },
//       {
//         text: 'Cancel',
//         style: 'cancel',
//       },
//     ],
//     {
//       cancelable: true,
//     },
//   );
// }, []);



// const renderItem: ListRenderItem<ChatMessage> = ({ item, index }) => {
//   if (item.authorId === 'system') {
//     return (
//       <View style={styles.systemWrap}>
//         <View style={styles.systemBubble}>
//           <Text style={styles.systemText}>
//             {item.body}
//           </Text>
//         </View>

//         <Text style={styles.timeMuted}>
//           {formatMessageTime(item.createdAt)}
//         </Text>
//       </View>
//     );
//   }

//   const mine = item.authorId === user?.id;
//   const isSending = mine && item.status === 'sending';
//   const isFailed = mine && item.status === 'failed';

//   // FlatList is inverted and listData is newest first.
//   // index + 1 = older message.
//   const olderNeighbour = listData[index + 1];

//   const isAuthorRunStart =
//     !mine &&
//     isGroupThread &&
//     (!olderNeighbour ||
//       olderNeighbour.authorId !== item.authorId);

//   return (
//     <View
//       style={[
//         styles.bubbleWrap,
//         mine
//           ? styles.bubbleWrapMine
//           : styles.bubbleWrapThem,
//       ]}
//     >
//       {/* Group chat author */}
//       {isAuthorRunStart ? (
//         <Pressable
//           onPress={() =>
//             openDirectWithUser(
//               item.authorId,
//               item.authorName,
//             )
//           }
//           hitSlop={layout.hitSlop}
//           accessibilityRole="button"
//           accessibilityLabel={`Open chat with ${item.authorName}`}
//           style={({ pressed }) => [
//             styles.authorRow,
//             pressed && styles.authorRowPressed,
//           ]}
//         >
//           <SenderAvatar
//             avatarUrl={
//               item.authorAvatarUrl ?? undefined
//             }
//             name={item.authorName}
//           />

//           <Text
//             style={styles.author}
//             numberOfLines={1}
//           >
//             {item.authorName}
//           </Text>
//         </Pressable>
//       ) : null}

//       {/* Direct chat author */}
//       {!mine && !isGroupThread ? (
//         <Text style={styles.author}>
//           {item.authorName}
//         </Text>
//       ) : null}

//       {/* Message bubble */}
//       <Pressable
//         onLongPress={() =>
//           handleMessageLongPress(item)
//         }
//         delayLongPress={400}
//         style={[
//           styles.bubble,
//           mine
//             ? styles.bubbleMine
//             : styles.bubbleThem,
//           item.locationContext &&
//             styles.bubbleLocation,
//           item.imageUrl &&
//             styles.bubbleImage,
//           isSending &&
//             styles.bubbleSending,
//           isFailed &&
//             styles.bubbleFailed,
//         ]}
//       >
//         {/* Image */}
//         {item.imageUrl ? (
//           <Image
//             source={{ uri: item.imageUrl }}
//             style={styles.chatImage}
//             resizeMode="cover"
//           />
//         ) : null}

//         {/* Text */}
//         {!item.locationContext &&
//          !item.listingContext &&
//         !item.imageUrl &&
//         item.body.trim().length > 0 ? (
//           <Text
//             style={[
//               styles.body,
//               mine && styles.bodyMine,
//             ]}
//           >
//             {item.body}
//           </Text>
//         ) : null}

//         {/* Location */}
//         {item.locationContext ? (
//           <ChatLocationAttachment
//             location={item.locationContext}
//           />
//         ) : null}

// {item.listingContext ? (
//   <ChatListingAttachment
//     listing={item.listingContext}
//     onPress={() => openListing(item.listingContext!.id)}
//   />
// ) : null}

//         {/* Time + sending/failed status */}
//         <View
//           style={[
//             styles.bubbleMetaRow,
//             mine
//               ? styles.bubbleMetaRowMine
//               : styles.bubbleMetaRowThem,
//           ]}
//         >
//           <Text
//             style={[
//               styles.timeRow,
//               mine && styles.bodyMine,
//             ]}
//           >
//             {formatMessageTime(item.createdAt)}
//           </Text>

//           {isSending ? (
//             <Text style={styles.metaHint}>
//               Sending…
//             </Text>
//           ) : null}

//           {isFailed ? (
//             <>
//               <Text style={styles.metaError}>
//                 Not delivered.
//               </Text>

//               <Pressable
//                 onPress={() =>
//                   retryFailedMessage(item)
//                 }
//                 hitSlop={layout.hitSlop}
//                 accessibilityRole="button"
//                 accessibilityLabel="Retry sending message"
//               >
//                 <Text style={styles.metaRetry}>
//                   Retry
//                 </Text>
//               </Pressable>
//             </>
//           ) : null}
//         </View>
//       </Pressable>
//     </View>
//   );
// };

//   // KeyboardAvoidingView (react-native-keyboard-controller) offsets.
//   // The header is rendered by `react-native-screens` outside the React view
//   // tree, so we compensate with its height. The library's behavior on both
//   // platforms uses native `WindowInsetsAnimationCompat` (Android) and
//   // `keyboardWillShow` (iOS) — no fragile manual lift math.
//   const keyboardOffset = headerHeight;

//   // Composer rest-state bottom padding (keyboard closed). ChatThread is
//   // now pushed above the tab navigator (via MainStackNavigator) — the
//   // native bottom tab bar isn't visible on this route, so the screen
//   // extends to the bottom of the window and the composer needs to clear
//   // the device's home-indicator / gesture-pill area itself. When the
//   // keyboard opens, react-native-keyboard-controller's
//   // KeyboardAvoidingView lifts the whole composer block above it.
//   const composerBottomPad =
//     Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 6) + spacing.xs;

//   const listBottomPad = useMemo(
//     () =>
//       composerBottomPad +
//       (sendError ? 28 : 0) +
//       56 +
//       spacing.md +
//       spacing.sm,
//     [composerBottomPad, sendError],
//   );

//   const threadBody = (
//     <SafeAreaView style={styles.safe} edges={['left', 'right']}>
//       {messagesQuery.isError && data.length > 0 ? (
//         <View style={styles.retryStrip}>
//           <Text style={styles.retryStripText} numberOfLines={2}>
//             {errorMessage(messagesQuery.error, 'Messages could not be refreshed.')}
//           </Text>
//           <Pressable
//             onPress={() => messagesQuery.refetch()}
//             style={({ pressed }) => [
//               styles.retryBtn,
//               pressed && styles.sendPressed,
//             ]}
//             accessibilityRole="button"
//             accessibilityLabel="Retry loading messages">
//             <Text style={styles.retryBtnLabel}>Retry</Text>
//           </Pressable>
//         </View>
//       ) : null}
 
//  {/* adds code 2 start  */}

// {isGroupThread ? (
//   <GroupAdsCarousel
//     ads={communityPostsQuery.data ?? []}
//     onAdvertiserPress={openAdvertiserChatFromAd}
//   />
// ) : null}

//  {/* adds code 2 start  */}

//       {messagesQuery.isError && data.length === 0 ? (
//         <View style={styles.stateBlock}>
//           <Text style={styles.stateTitle}>Could not load chat</Text>
//           <Text style={styles.stateBody}>
//             {errorMessage(messagesQuery.error, 'Check your connection and try again.')}
//           </Text>
//           <Pressable
//             onPress={() => messagesQuery.refetch()}
//             style={({ pressed }) => [
//               styles.retryBtnLarge,
//               pressed && styles.sendPressed,
//             ]}
//             accessibilityRole="button"
//             accessibilityLabel="Retry loading messages">
//             <Text style={styles.retryBtnLabelLight}>Try again</Text>
//           </Pressable>
//         </View>
//       ) : messagesQuery.isPending && data.length === 0 ? (
//         <View style={styles.stateBlock}>
//           <ActivityIndicator size="large" color={colors.primary} />
//           <Text style={styles.loadingHint}>Loading messages…</Text>
//         </View>
//       ) : (
//         <FlatList
//           ref={listRef}
//           style={styles.listFlex}
//           data={listData}
//           inverted={listData.length > 0}
//           // Prefer the client-generated idempotency key when present so the
//           // optimistic placeholder and the server-confirmed message share the
//           // same React key — without this, the bubble unmounts and remounts
//           // on the optimistic→confirmed swap (visible as a flicker).
//           keyExtractor={m => m.clientId ?? m.id}
//           extraData={`${listData.length}-${sendError ?? ''}`}
//           renderItem={renderItem}
//           ListFooterComponent={
//             messagesQuery.isFetchingNextPage || listHeader ? (
//               <View>
//                 {messagesQuery.isFetchingNextPage ? (
//                   <View style={styles.historyLoading}>
//                     <ActivityIndicator size="small" color={colors.primary} />
//                     <Text style={styles.historyLoadingText}>
//                       Loading earlier messages…
//                     </Text>
//                   </View>
//                 ) : null}
//                 {listHeader ? (
//                   <View style={styles.listFooter}>{listHeader}</View>
//                 ) : null}
//               </View>
//             ) : null
//           }
//           ListEmptyComponent={
//             <View style={styles.emptyThread}>
//               <Text style={styles.emptyThreadTitle}>No messages yet</Text>
//               <Text style={styles.emptyThreadBody}>
//                 Say hello to start the conversation.
//               </Text>
//             </View>
//           }
//           contentContainerStyle={[
//             styles.list,
//             listData.length > 0 ? styles.listInverted : styles.listNonInverted,
//             listData.length > 0
//               ? { paddingTop: listBottomPad }
//               : { paddingBottom: listBottomPad },
//             listData.length === 0 && styles.listEmptyCentered,
//           ]}
//           keyboardShouldPersistTaps="always"
//           maintainVisibleContentPosition={
//             listData.length > 0
//               ? { minIndexForVisible: 0, autoscrollToTopThreshold: 24 }
//               : undefined
//           }
//           keyboardDismissMode={
//             Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//           }
//           onScroll={onScroll}
//           scrollEventThrottle={24}
//           onEndReached={() => {
//             if (
//               messagesQuery.hasNextPage &&
//               !messagesQuery.isFetchingNextPage
//             ) {
//               void messagesQuery.fetchNextPage();
//             }
//           }}
//           onEndReachedThreshold={0.35}
//           initialNumToRender={24}
//           maxToRenderPerBatch={16}
//           windowSize={12}
//           showsVerticalScrollIndicator={false}
//           removeClippedSubviews={Platform.OS === 'android' ? false : undefined}
//           overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
//         />
//       )}

     

//          <View
//   style={[
//     styles.composerDock,
//     { paddingBottom: composerBottomPad },
//   ]}
// >

//   {!isGroupThread && attachmentMenuOpen ? (
//     <View style={styles.attachmentMenu}>
//       <Pressable
//         style={({ pressed }) => [
//           styles.attachmentOption,
//           pressed && styles.sendPressed,
//         ]}
//         onPress={takePhoto}
//       >
//         <View style={styles.attachmentIcon}>
//           <Camera
//             color={colors.primary}
//             size={iconSize.md}
//             strokeWidth={iconStroke}
//           />
//         </View>

//         <Text style={styles.attachmentLabel}>
//           Camera
//         </Text>
//       </Pressable>

//       <Pressable
//         style={({ pressed }) => [
//           styles.attachmentOption,
//           pressed && styles.sendPressed,
//         ]}
//         onPress={pickImageFromGallery}
//       >
//         <View style={styles.attachmentIcon}>
//           <ImageIcon
//             color={colors.primary}
//             size={iconSize.md}
//             strokeWidth={iconStroke}
//           />
//         </View>

//         <Text style={styles.attachmentLabel}>
//           Gallery
//         </Text>
//       </Pressable>

//       <Pressable
//         style={({ pressed }) => [
//           styles.attachmentOption,
//           pressed && styles.sendPressed,
//         ]}
//         onPress={shareCurrentLocation}
//         disabled={isCapturingLocation}
//       >
//         <View style={styles.attachmentIcon}>
//           {isCapturingLocation ? (
//             <ActivityIndicator
//               size="small"
//               color={colors.primary}
//             />
//           ) : (
//             <MapPin
//               color={colors.primary}
//               size={iconSize.md}
//               strokeWidth={iconStroke}
//             />
//           )}
//         </View>

//         <Text style={styles.attachmentLabel}>
//           Location
//         </Text>
//       </Pressable>
//     </View>
//   ) : null}

//   <View style={styles.composer}>
//         {sendError ? (
//           <Text style={styles.sendErrorText} accessibilityLiveRegion="polite">
//             {sendError}
//           </Text>
//         ) : null}
//         <View style={styles.composerRow}>

         
// {/* 
//           <Pressable
//   onPress={() => setAttachmentMenuOpen(prev => !prev)}
//   disabled={send.isPending}
//   hitSlop={layout.hitSlop}
//   style={({ pressed }) => [
//     styles.locationPressable,
//     send.isPending && styles.sendDisabled,
//     pressed && !send.isPending && styles.sendPressed,
//   ]}
//   accessibilityRole="button"
//   accessibilityLabel={
//     attachmentMenuOpen
//       ? 'Close attachment options'
//       : 'Open attachment options'
//   }
// >
//   {attachmentMenuOpen ? (
//     <X
//       color={colors.primary}
//       size={iconSize.md}
//       strokeWidth={iconStroke}
//     />
//   ) : (
//     <Paperclip
//       color={colors.primary}
//       size={iconSize.md}
//       strokeWidth={iconStroke}
//     />
//   )}
// </Pressable> */}

// {/* adds code 4 start */}
// {isGroupThread ? (
//   <Pressable
//    onPress={openCreateCommunityPost}
//     disabled={send.isPending}
//     hitSlop={layout.hitSlop}
//     style={({ pressed }) => [
//       styles.addPostButton,
//       send.isPending && styles.sendDisabled,
//       pressed && !send.isPending && styles.sendPressed,
//     ]}
//     accessibilityRole="button"
//     accessibilityLabel="Add Post"
//   >
//    <ImageIcon
//   color={colors.primary}
//   size={iconSize.md}
//   strokeWidth={iconStroke}
// />
//   </Pressable>
// ) : (
//   <Pressable
//     onPress={() => setAttachmentMenuOpen(prev => !prev)}
//     disabled={send.isPending}
//     hitSlop={layout.hitSlop}
//     style={({ pressed }) => [
//       styles.locationPressable,
//       send.isPending && styles.sendDisabled,
//       pressed && !send.isPending && styles.sendPressed,
//     ]}
//     accessibilityRole="button"
//     accessibilityLabel={
//       attachmentMenuOpen
//         ? 'Close attachment options'
//         : 'Open attachment options'
//     }
//   >
//     {attachmentMenuOpen ? (
//       <X
//         color={colors.primary}
//         size={iconSize.md}
//         strokeWidth={iconStroke}
//       />
//     ) : (
//       <Paperclip
//         color={colors.primary}
//         size={iconSize.md}
//         strokeWidth={iconStroke}
//       />
//     )}
//   </Pressable>
// )}





//           <TextInput
//             ref={messageInputRef}
//             value={draft}
//             onChangeText={text => {
//               setDraft(text);
//               if (!text.trim()) {
//                 flushTypingStop();
//                 return;
//               }
//               // Emit `start` immediately on the first keystroke so the peer
//               // sees the indicator in real time, then auto-`stop` after
//               // TYPING_STOP_DEBOUNCE_MS of input inactivity.
//               dispatchTypingStart();
//             }}
//             onBlur={() => flushTypingStop()}
//            placeholder={
//   typingName
//     ? `${typingName} is typing…`
//     : `Message ${displayTitle ?? '…'}`
// }
//             placeholderTextColor={colors.textMuted}
//             style={styles.input}
//            multiline={false}
// numberOfLines={1}
//             blurOnSubmit={false}
//             textAlignVertical="top"
//             accessibilityLabel="Message text field"
//           />
//           <Pressable
//             onPress={() => {
//               const trimmed = draft.trim();
//               if (!trimmed || send.isPending) {
//                 return;
//               }
//               send.mutate({
//                 body: trimmed,
//                 clientId: newClientMessageId(),
//               });
//               flushTypingStop();
//             }}
//             hitSlop={layout.hitSlop}
//             style={({ pressed }) => [
//               styles.sendPressable,
//               (!draft.trim() || send.isPending) && styles.sendDisabled,
//               pressed && draft.trim() && !send.isPending && styles.sendPressed,
//             ]}
//             disabled={!draft.trim() || send.isPending}
//             accessibilityRole="button"
//             accessibilityLabel="Send message"
//             accessibilityState={{ disabled: !draft.trim() || send.isPending }}>
//             <LinearGradient
//               colors={colors.brandGradient}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={styles.sendGradient}>
//               <Send
//                 color={colors.onBrandGradient}
//                 size={iconSize.md}
//                 strokeWidth={iconStroke}
//               />
//             </LinearGradient>
//           </Pressable>
//         </View>
//         </View>
//       </View>
//     </SafeAreaView>
//   );

//   // `KeyboardAvoidingView` from `react-native-keyboard-controller` —
//   // native-driven keyboard tracking (WindowInsetsAnimationCompat on
//   // Android, `keyboardWillShow` on iOS). This is the pattern used by
//   // Bluesky / Stream Chat / Rocket.Chat for chat composers; it works
//   // reliably with new architecture + react-native-screens where the stock
//   // RN `KeyboardAvoidingView` is known-broken. `translate-with-padding`
//   // is the recommended behavior for chat — it preserves layout (no list
//   // remeasure) and pushes the composer up via translation.
//   return (
//     <KeyboardAvoidingView
//       style={styles.flex}
//       behavior="translate-with-padding"
//       keyboardVerticalOffset={keyboardOffset}>
//       {threadBody}
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   flex: { flex: 1, backgroundColor: colors.background },
//   safe: { flex: 1, backgroundColor: colors.background },
//   /** Required so the list does not grow to full message height and shove the composer under the keyboard (especially Android + adjustResize). */
//   listFlex: { flex: 1, backgroundColor: colors.background },
//   list: {
//     paddingHorizontal: layout.screenPaddingHorizontal,
//     gap: spacing.md,
//     flexGrow: 1,
//   },
//   /** Inverted: extra space by the composer is `paddingTop` in coordinates (visual bottom). */
//   listInverted: {
//     paddingBottom: spacing.sm,
//   },
//   /** Non-inverted empty state: space above composer. */
//   listNonInverted: {
//     paddingTop: spacing.sm,
//   },
//   listEmptyCentered: {
//     flexGrow: 1,
//     justifyContent: 'center',
//   },
//   /** With `inverted`, footer renders at the visual top (older side of the thread). */
//   listFooter: {
//     marginBottom: spacing.lg,
//   },
//   historyLoading: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: spacing.sm,
//     paddingVertical: spacing.md,
//   },
//   historyLoadingText: {
//     ...typography.caption,
//     color: colors.textMuted,
//   },
//   contextBanner: {
//     gap: spacing.sm,
//   },
//   contextLabel: {
//     ...typography.overline,
//     color: colors.textMuted,
//     letterSpacing: 0.5,
//   },
//   threadHint: {
//     ...typography.bodySmall,
//     color: colors.textSecondary,
//     lineHeight: 20,
//   },

// // adds code 3 start

// groupAdArea: {
//   flex: 1,
//   minHeight: 0,
//   paddingHorizontal:
//     layout.screenPaddingHorizontal,
//   paddingTop: spacing.sm,
//   paddingBottom: spacing.xs,
// },

// groupAdList: {
//   flex: 1,
// },

// groupAdPage: {
//   width: '100%',
//   flex: 1,
// },

// groupAdCard: {
//   flex: 1,
//   minHeight: 0,
//   padding: spacing.sm,
//   borderRadius: layout.radius.lg,
//   backgroundColor: colors.surface,
//   borderWidth: StyleSheet.hairlineWidth,
//   borderColor: colors.border,
//   overflow: 'hidden',
// },

// groupAdHeader: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   gap: spacing.sm,
// },

// groupAdAdvertiserPressable: {
//   flex: 1,
//   flexDirection: 'row',
//   alignItems: 'center',
//   gap: spacing.sm,
//   minWidth: 0,
// },

// groupAdHeaderText: {
//   flex: 1,
//   minWidth: 0,
// },

// groupAdAdvertiser: {
//   ...typography.bodySmall,
//   color: colors.textPrimary,
//   fontWeight: '700',
// },

// groupAdTitle: {
//   ...typography.caption,
//   color: colors.textSecondary,
//   marginTop: 1,
// },

// groupAdBadge: {
//   paddingHorizontal: spacing.xs,
//   paddingVertical: 2,
//   borderRadius: layout.radius.sm,
//   backgroundColor: colors.primarySoft,
// },

// groupAdBadgeText: {
//   ...typography.caption,
//   fontSize: 10,
//   fontWeight: '700',
//   color: colors.primary,
// },

// groupAdDescription: {
//   ...typography.bodySmall,
//   color: colors.textSecondary,
//   marginTop: spacing.xs,
//   marginBottom: spacing.xs,
// },

// groupAdImageContainer: {
//   flex: 1,
//   minHeight: 0,
//   borderRadius: layout.radius.md,
//   backgroundColor: colors.surfaceMuted,
//   overflow: 'hidden',
// },
// groupAdNoImage: {
//   flex: 1,
//   alignItems: 'center',
//   justifyContent: 'center',
//   backgroundColor: colors.surfaceMuted,
// },

// groupAdNoImageText: {
//   ...typography.caption,
//   color: colors.textMuted,
// },
// groupAdImage: {
//   width: '100%',
//   height: '100%',
// },

// groupAdIndicatorRow: {
//   flexDirection: 'row',
//   justifyContent: 'center',
//   alignItems: 'center',
//   gap: spacing.xs,
//   paddingVertical: spacing.xs,
// },

// groupAdDot: {
//   width: 6,
//   height: 6,
//   borderRadius: 3,
//   backgroundColor: colors.borderStrong,
// },

// groupAdDotActive: {
//   width: 8,
//   height: 8,
//   borderRadius: 4,
//   backgroundColor: colors.primary,
// },

// groupAdThumbnailsRow: {
//   width: '100%',
//   flexDirection: 'row',
//   gap: spacing.xs,
//   height: 44,
// },

// groupAdThumbnailWrap: {
//   flex: 1,
//   minWidth: 0,
//   borderRadius: layout.radius.sm,
//   padding: 2,
//   borderWidth: 1,
//   borderColor: 'transparent',
// },

// groupAdThumbnailActive: {
//   borderColor: colors.primary,
// },

// groupAdThumbnail: {
//   width: '100%',
//   height: '100%',
//   borderRadius: layout.radius.sm,
//   backgroundColor: colors.surfaceMuted,
// },

// // adds code 3 end



//   bubbleWrap: { maxWidth: '85%' },
//   bubbleWrapMine: { alignSelf: 'flex-end' },
//   bubbleWrapThem: { alignSelf: 'flex-start' },
//   /** Group chat author header: avatar + name above the first bubble in a run. */
//   authorRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: spacing.xs,
//     marginBottom: 4,
//     marginLeft: 4,
//   },
//   authorRowPressed: { opacity: 0.7 },
//   author: {
//     ...typography.caption,
//     color: colors.textSecondary,
//     fontWeight: '600',
//     marginBottom: 4,
//     marginLeft: 4,
//     maxWidth: 200,
//   },
//   bubble: {
//     borderRadius: layout.radius.lg,
//     paddingVertical: 11,
//     paddingHorizontal: 14,
//   },
//   chatImage: {
//   width: 240,
//   height: 240,
//   borderRadius: layout.radius.md,
// },
// bubbleImage: {
//   padding: 4,
// },
//   /** When a location card is embedded, shrink bubble padding so the card
//    *  reaches close to the bubble edge and the map preview reads as the
//    *  primary content. */
//   bubbleLocation: {
//     padding: 4,
//   },
//   bubbleMine: {
//     backgroundColor: colors.primary,
//     borderBottomRightRadius: layout.radius.sm,
//     ...shadows.cardSubtle,
//   },
//   bubbleThem: {
//     backgroundColor: colors.surface,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: colors.border,
//     borderBottomLeftRadius: layout.radius.sm,
//     ...shadows.cardSubtle,
//   },
//   body: {
//     ...typography.body,
//     fontSize: 15,
//     lineHeight: 22,
//     color: colors.textPrimary,
//   },
//   bodyMine: { color: colors.onPrimary },
//   /** Optimistic-pending: dim the bubble subtly to communicate "in flight". */
//   bubbleSending: { opacity: 0.7 },
//   /** Failed send: red border on the bubble, retry control rendered next to the time. */
//   bubbleFailed: {
//     borderWidth: 1,
//     borderColor: colors.danger,
//   },
//   bubbleMetaRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: spacing.xs,
//     marginTop: 4,
//   },
//   bubbleMetaRowMine: { alignSelf: 'flex-end', marginRight: 4 },
//   bubbleMetaRowThem: { alignSelf: 'flex-start', marginLeft: 4 },
//   timeRow: {
//     ...typography.caption,
//     fontSize: 11,
//     color: colors.textMuted,
//   },
//   metaHint: {
//     ...typography.caption,
//     fontSize: 11,
//     color: colors.textMuted,
//     fontStyle: 'italic',
//   },
//   metaError: {
//     ...typography.caption,
//     fontSize: 11,
//     color: colors.danger,
//     fontWeight: '600',
//   },
//   metaRetry: {
//     ...typography.caption,
//     fontSize: 11,
//     color: colors.primary,
//     fontWeight: '700',
//     textDecorationLine: 'underline',
//   },
//   systemWrap: {
//     alignSelf: 'center',
//     maxWidth: '92%',
//     alignItems: 'center',
//     gap: 6,
//     marginVertical: spacing.xs,
//   },
//   systemBubble: {
//     backgroundColor: colors.surfaceMuted,
//     paddingVertical: spacing.sm,
//     paddingHorizontal: spacing.md,
//     borderRadius: layout.radius.md,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: colors.border,
//   },
//   systemText: {
//     ...typography.bodySmall,
//     color: colors.textSecondary,
//     lineHeight: 20,
//     textAlign: 'center',
//   },
//   timeMuted: {
//     ...typography.caption,
//     fontSize: 11,
//     color: colors.textTabInactive,
//   },
//   /** Full-width surface under the field so nothing below the input shows `background`. */
//   composerDock: {
//     backgroundColor: colors.surface,
//     borderTopWidth: StyleSheet.hairlineWidth,
//     borderTopColor: colors.divider,
//     ...Platform.select({
//       ios: {
//         shadowColor: '#000',
//         shadowOpacity: 0.05,
//         shadowRadius: 10,
//         shadowOffset: { width: 0, height: -3 },
//       },
//       android: {
//         elevation: 6,
//       },
//     }),
//   },
//   composer: {
//     paddingHorizontal: layout.screenPaddingHorizontal,
//     paddingTop: spacing.sm,
//     paddingBottom: spacing.xs,
//     backgroundColor: colors.surface,
//   },
//   composerRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     gap: spacing.sm,
//   },
//   sendErrorText: {
//     ...typography.caption,
//     color: colors.danger,
//     marginBottom: spacing.sm,
//     paddingHorizontal: spacing.xs,
//   },
//   retryStrip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: spacing.md,
//     paddingHorizontal: layout.screenPaddingHorizontal,
//     paddingVertical: spacing.sm,
//     backgroundColor: colors.tipBg,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: colors.tipBorder,
//   },
//   retryStripText: {
//     ...typography.bodySmall,
//     flex: 1,
//     color: colors.tipText,
//   },
//   retryBtn: {
//     paddingVertical: spacing.xs,
//     paddingHorizontal: spacing.md,
//     borderRadius: layout.radius.md,
//     backgroundColor: colors.surface,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: colors.borderStrong,
//   },
//   retryBtnLarge: {
//     marginTop: spacing.lg,
//     paddingVertical: spacing.md,
//     paddingHorizontal: spacing.xl,
//     borderRadius: layout.radius.full,
//     backgroundColor: colors.primary,
//     minWidth: 160,
//     alignItems: 'center',
//   },
//   retryBtnLabel: {
//     ...typography.bodySmall,
//     fontWeight: '700',
//     color: colors.primary,
//   },
//   retryBtnLabelLight: {
//     ...typography.bodySmall,
//     fontWeight: '700',
//     color: colors.onPrimary,
//   },
//   stateBlock: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: layout.screenPaddingHorizontal,
//     gap: spacing.md,
//   },
//   stateTitle: {
//     ...typography.title,
//     color: colors.textPrimary,
//     textAlign: 'center',
//   },
//   stateBody: {
//     ...typography.body,
//     color: colors.textSecondary,
//     textAlign: 'center',
//     lineHeight: 22,
//   },
//   loadingHint: {
//     ...typography.bodySmall,
//     color: colors.textMuted,
//   },
//   emptyThread: {
//     paddingVertical: spacing.xxl,
//     paddingHorizontal: spacing.md,
//     alignItems: 'center',
//     gap: spacing.xs,
//   },
//   emptyThreadTitle: {
//     ...typography.headline,
//     color: colors.textSecondary,
//   },
//   emptyThreadBody: {
//     ...typography.bodySmall,
//     color: colors.textMuted,
//     textAlign: 'center',
//   },
//   input: {
//     flex: 1,
//     ...typography.body,
//     fontSize: 16,
//     lineHeight: 22,
//     maxHeight: 120,
//     minHeight: 44,
//     paddingHorizontal: spacing.md,
//     paddingVertical: Platform.OS === 'ios' ? 11 : 10,
//     backgroundColor: colors.surfaceMuted,
//     borderRadius: layout.radius.full,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: colors.border,
//     color: colors.textPrimary,
//   },
//   sendPressable: {
//     width: layout.minTouchTarget,
//     height: layout.minTouchTarget,
//     borderRadius: layout.minTouchTarget / 2,
//     overflow: 'hidden',
//     /** Hairline highlight reads as a polished pill rim against dark canvas. */
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: colors.borderStrong,
//     ...shadows.button,
//   },
//   /** Plain-surface companion to sendPressable for the location-share affordance.
//    *  Same touch target so the composer row stays visually balanced. */
//   locationPressable: {
//     width: layout.minTouchTarget,
//     height: layout.minTouchTarget,
//     borderRadius: layout.minTouchTarget / 2,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: colors.surfaceMuted,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: colors.border,
//   },

//   // adds code 5 start
//  addPostButton: {
//   width: layout.minTouchTarget,
//   height: layout.minTouchTarget,
//   borderRadius: layout.minTouchTarget / 2,
//   alignItems: 'center',
//   justifyContent: 'center',
//   backgroundColor: colors.primarySoft,
// },

// sendGradient: {
//   flex: 1,
//   alignItems: 'center',
//   justifyContent: 'center',
// },

// sendDisabled: {
//   opacity: 0.38,
// },

// sendPressed: {
//   opacity: 0.9,
// },

// // adds code 5 end

// attachmentMenu: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   justifyContent: 'flex-start',
//   gap: spacing.lg,
//   paddingHorizontal: layout.screenPaddingHorizontal,
//   paddingVertical: spacing.md,
//   backgroundColor: colors.surface,
//   borderTopWidth: StyleSheet.hairlineWidth,
//   borderTopColor: colors.divider,
// },

// attachmentOption: {
//   alignItems: 'center',
//   justifyContent: 'center',
//   minWidth: 72,
//   gap: spacing.xs,
// },

// attachmentIcon: {
//   width: 48,
//   height: 48,
//   borderRadius: 24,
//   alignItems: 'center',
//   justifyContent: 'center',
//   backgroundColor: colors.primarySoft,
// },

// attachmentLabel: {
//   ...typography.caption,
//   fontSize: 12,
//   fontWeight: '600',
//   color: colors.textSecondary,
// },

// });
