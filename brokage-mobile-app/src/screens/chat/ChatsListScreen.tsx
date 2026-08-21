import type { NativeBottomTabNavigationProp } from '@bottom-tabs/react-navigation';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { navigateToChatsThread } from '../../navigation/crossTabNavigate';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  MessageCircle,
  Users,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { displayThreadUnread, sameId } from '../../chat/threadUnread';
import { errorMessage, fetchThreads } from '../../api/client';
import type { ChatsStackParamList, MainTabParamList } from '../../navigation/types';
import type { ChatThread } from '../../types/models';
import { useActiveChatThreadStore } from '../../stores/activeChatThreadStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { screenStyles } from '../../theme/screenStyles';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatChatListTime } from '../../utils/formatChatTime';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<ChatsStackParamList, 'ChatList'>,
  NativeBottomTabNavigationProp<MainTabParamList>
>;

function ThreadSeparator() {
  return <View style={chatListStyles.separator} />;
}

function formatUnreadBadge(n: number): string {
  if (!Number.isFinite(n) || n <= 0) {
    return '';
  }
  if (n > 99) {
    return '99+';
  }
  return String(Math.floor(n));
}

function ThreadRowAvatar({ thread }: { thread: ChatThread }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  if (thread.type === 'group') {
    return (
      <Users
        color={colors.primary}
        size={iconSize.md}
        strokeWidth={iconStroke}
      />
    );
  }

  if (thread.peerAvatarUrl && !imgFailed) {
    return (
      <Image
        source={{ uri: thread.peerAvatarUrl }}
        style={chatListStyles.avatarImg}
        onError={() => setImgFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }
  // if (thread.relatedListing?.imageUrl && !imgFailed) {
  //   return (
  //     <Image
  //       source={{ uri: thread.relatedListing.imageUrl }}
  //       style={chatListStyles.avatarImg}
  //       onError={() => setImgFailed(true)}
  //       accessibilityIgnoresInvertColors
  //     />
  //   );
  // }
  return (
    <MessageCircle
      color={colors.primary}
      size={iconSize.md}
      strokeWidth={iconStroke}
    />
  );
}

/**
 * Memoized row, structured as a static View wrapper with a transparent
 * Pressable layer on top. This is the canonical Fabric-safe touchable-row
 * pattern — the old structure (`Pressable` as the wrapper with a
 * function `style` prop) re-evaluates its style array on every press
 * AND every re-render of the parent FlatList, which interacts badly with
 * Fabric's render-commit pipeline and was producing the "row that was
 * tapped goes blank when you return from the thread" bug. Splitting the
 * touchable from the visual layer keeps the View's style identity stable
 * across press / re-render cycles.
 *
 * Background pattern is also kept on every child View (avatar, meta,
 * badge) so even if a future Fabric pass were to drop the wrapper's
 * background, no child can fall back to the canvas color.
 */
const ChatListRow = React.memo(function ChatListRow({
  thread,
  isActive,
  onPress,
}: {
  thread: ChatThread;
  isActive: boolean;
  onPress: (thread: ChatThread) => void;
}) {
  const unreadCount = isActive ? 0 : displayThreadUnread(thread.unreadCount);
  const unreadBadge = formatUnreadBadge(unreadCount);
  const hasUnread = Boolean(unreadBadge);
  const unreadSuffix = unreadBadge ? `, ${unreadBadge} unread` : '';
  return (
    <View style={[chatListStyles.row, hasUnread && chatListStyles.rowUnread]}>
      <View style={chatListStyles.avatar}>
        <ThreadRowAvatar thread={thread} />
      </View>
      <View style={chatListStyles.meta}>
        <View style={chatListStyles.titleRow}>
          <Text
            style={[
              chatListStyles.threadTitle,
              hasUnread && chatListStyles.threadTitleUnread,
            ]}
            numberOfLines={1}>
            {thread.title}
          </Text>
          <Text style={chatListStyles.time}>
            {formatChatListTime(thread.updatedAt)}
          </Text>
        </View>
        
        <View style={chatListStyles.previewRow}>
          <Text
            style={[
              chatListStyles.preview,
              hasUnread && chatListStyles.previewUnread,
            ]}
            numberOfLines={2}>
            {thread.lastMessage}
          </Text>
          {unreadBadge ? (
            <View style={chatListStyles.badge}>
              <Text style={chatListStyles.badgeText}>{unreadBadge}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight
        color={colors.textMuted}
        size={iconSize.md}
        strokeWidth={iconStroke}
      />
      {/* Touchable layer is the LAST child so it sits on top of the row
          content but doesn't intercept its layout. `StyleSheet.absoluteFill`
          gives the Pressable the full row bounds. Android ripple still
          shows under the content thanks to the elevation/z-index ordering;
          iOS uses opacity feedback. Border-radius matches the row so the
          ripple respects the rounded corners. */}
      <Pressable
        android_ripple={{ color: colors.washPrimary, borderless: false }}
        style={({ pressed }) => [
          chatListStyles.rowTouchable,
          pressed && Platform.OS === 'ios' && chatListStyles.rowTouchablePressed,
        ]}
        onPress={() => onPress(thread)}
        accessibilityRole="button"
        accessibilityLabel={`${thread.title}${unreadSuffix}`}
      />
    </View>
  );
});

export function ChatsListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<ChatsStackParamList, 'ChatList'>>();
  const tabBarHeight = useBottomTabBarHeight();
  const user = useAuthStore(s => s.user);
  const activeThreadId = useActiveChatThreadStore(s => s.activeThreadId);
  const isGroupMode = route.params?.mode === 'group';
  const screenTitle = route.params?.title ?? (isGroupMode ? 'Group Chat' : 'Chats');
  const screenSubtitle =
    route.params?.subtitle ??
    (isGroupMode
      ? 'Community space discussions with members.'
      : 'Community space and private notes with hosts about listings.');

  const threadsQuery = useQuery({
    queryKey: ['threads', user?.id],
    queryFn: () => fetchThreads(user!),
    enabled: !!user,
  });
  const threads = threadsQuery.data ?? [];
  const visibleThreads = isGroupMode
    ? threads.filter(thread => thread.type === 'group')
    : threads.filter(thread => thread.type !== 'group');
  const listLoading =
    Boolean(user) &&
    threadsQuery.fetchStatus === 'fetching' &&
    threadsQuery.data === undefined;
  const listError = threadsQuery.isError && threadsQuery.data === undefined;

  /**
   * Group Chat tab: jump straight into the default group thread on first
   * visit. ChatThread now lives on the parent MainStack (so the bottom
   * tab bar disappears for the conversation), which means we navigate
   * via `navigateToChatsThread` — `navigation.replace` here would only
   * target this inner stack and can't reach the parent. Push semantics
   * are fine: back returns the user to the ChatList view of this tab.
   * The ref guarantees this fires once per mount — without it every
   * realtime threads update would re-trigger the effect.
   */
  const hasAutoOpenedGroupThreadRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !isGroupMode ||
      hasAutoOpenedGroupThreadRef.current ||
      listLoading ||
      listError
    ) {
      return;
    }
    const defaultGroupThread = visibleThreads[0];
    if (!defaultGroupThread) {
      return;
    }
    hasAutoOpenedGroupThreadRef.current = true;
    navigateToChatsThread(navigation, {
      threadId: defaultGroupThread.id,
      title: defaultGroupThread.title,
      relatedListing: defaultGroupThread.relatedListing,
    });
  }, [isGroupMode, listLoading, listError, visibleThreads, navigation]);

  const openThread = React.useCallback(
    (t: ChatThread) => {
      navigateToChatsThread(navigation, {
        threadId: t.id,
        title: t.title,
        relatedListing: t.relatedListing,
      });
    },
    [navigation],
  );

  const renderItem = React.useCallback(
    ({ item: t }: { item: ChatThread }) => (
      <ChatListRow
        thread={t}
        isActive={Boolean(activeThreadId && sameId(t.id, activeThreadId))}
        onPress={openThread}
      />
    ),
    [activeThreadId, openThread],
  );

  return (
    <SafeAreaView style={chatListStyles.safe} edges={['top', 'left', 'right']}>
      <View style={chatListStyles.header}>
        <Text style={screenStyles.sectionOverline}>Inbox</Text>
        <Text style={chatListStyles.title}>{screenTitle}</Text>
        <Text style={chatListStyles.sub}>
          {screenSubtitle}
        </Text>
      </View>

      <View style={chatListStyles.body}>
      {listLoading ? (
        <View style={chatListStyles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={chatListStyles.loadingText}>Loading chats…</Text>
        </View>
      ) : listError ? (
        <View style={chatListStyles.errorBlock}>
          <Text style={chatListStyles.errorTitle}>Could not load chats</Text>
          <Text style={chatListStyles.errorBody}>
            {errorMessage(threadsQuery.error, 'Check your connection and try again.')}
          </Text>
          <Pressable
            style={({ pressed }) => [
              chatListStyles.retryCta,
              pressed && chatListStyles.pressed,
            ]}
            onPress={() => threadsQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading chats">
            <Text style={chatListStyles.retryCtaLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : visibleThreads.length === 0 ? (
        <View style={chatListStyles.empty}>
          <View style={chatListStyles.emptyIcon}>
            <MessageCircle
              color={colors.primary}
              size={iconSize.lg + 8}
              strokeWidth={iconStroke}
            />
          </View>
          <Text style={chatListStyles.emptyTitle}>Your inbox is quiet</Text>
          <Text style={chatListStyles.emptyBody}>
            {isGroupMode
              ? 'When you join a group conversation, it will show up here.'
              : 'When you join conversations or message a host, threads show up here with the listing they are about.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleThreads}
          keyExtractor={t => t.id}
          renderItem={renderItem}
          // `extraData` must invalidate when either the threads cache
          // updates OR the active-thread pin flips (the row's `isActive`
          // prop depends on it). Without `activeThreadId` here, returning
          // from a thread would leave memoized rows showing the stale
          // "active" state until the next thread:update push arrives.
          extraData={`${threadsQuery.dataUpdatedAt}:${activeThreadId ?? ''}`}
          style={chatListStyles.listFlex}
          contentContainerStyle={[
            chatListStyles.list,
            chatListStyles.listContent,
            // The screen sits above the tab bar, but the FlatList content
            // is scrollable — without explicit bottom padding the last row
            // ends right against the tab-bar top and feels cramped. Reserve
            // tabBarHeight so the user can scroll the final item fully into
            // view above the tab bar.
            { paddingBottom: spacing.xxl + tabBarHeight },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ThreadSeparator}
          removeClippedSubviews={Platform.OS === 'android' ? false : undefined}
          overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
          refreshControl={
            <RefreshControl
              refreshing={threadsQuery.isRefetching && !listLoading}
              onRefresh={() => threadsQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const chatListStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  /** Fills space below header so Android never shows a transparent strip above the tab bar. */
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.displayMedium,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  sub: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  /** FlatList surface — explicit on Android to avoid default transparent scroll view. */
  listFlex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  separator: { height: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    // Intentionally NOT `overflow: 'hidden'` here — it interacts badly
    // with Fabric + Pressable on Android and was contributing to rows
    // losing their text content when re-rendered after a focus change.
    // The Pressable touchable layer below has its own borderRadius so the
    // ripple respects the rounded corners.
    position: 'relative',
    ...shadows.cardSubtle,
  },
  rowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  /** Transparent touchable overlay covering the full row. See ChatListRow
   *  comment for why the touchable is a sibling of the visual content
   *  instead of a wrapper. */
  rowTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: layout.radius.xl,
    overflow: 'hidden',
  },
  /** iOS-only pressed state — a subtle wash overlay reads as a deliberate
   *  press without dimming the row content. Android uses `android_ripple`
   *  on the Pressable and doesn't need this. */
  rowTouchablePressed: { backgroundColor: colors.washPrimary },
  /** Legacy alias — keep so external press feedback (retry button etc.)
   *  doesn't break. New code should use `rowTouchablePressed`. */
  pressed: { opacity: 0.75 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  meta: { flex: 1, gap: 4, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  threadTitle: {
    ...typography.headline,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  threadTitleUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  time: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  listingChip: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  preview: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.textMuted,
    lineHeight: 20,
  },
  previewUnread: {
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 22,
    paddingHorizontal: 7,
    alignItems: 'center',
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  errorBlock: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  retryCta: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.radius.full,
    backgroundColor: colors.primary,
    minWidth: 160,
    alignItems: 'center',
  },
  retryCtaLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  empty: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
});
