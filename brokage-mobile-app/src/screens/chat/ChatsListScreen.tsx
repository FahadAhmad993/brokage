import type { NativeBottomTabNavigationProp } from '@bottom-tabs/react-navigation';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { navigateToChatsThread, navigateToUserDisplayFromSearch } from '../../navigation/crossTabNavigate';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  MessageCircle,
  Search,
  Users,
  X,
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { displayThreadUnread, sameId } from '../../chat/threadUnread';
import { deleteChatThread, errorMessage, fetchThreads, searchDisplayBrokers } from '../../api/client';
import { ActionMenu, type ActionMenuItem } from '../../components/ActionMenu';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import type { ChatsStackParamList, MainTabParamList } from '../../navigation/types';
import type { ChatThread, DisplayBrokerCard } from '../../types/models';
import { useActiveChatThreadStore } from '../../stores/activeChatThreadStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatChatListTime } from '../../utils/formatChatTime';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<ChatsStackParamList, 'ChatList'>,
  NativeBottomTabNavigationProp<MainTabParamList>
>;

function ThreadSeparator() {
  const chatListStyles = useThemedStyles(buildChatListStyles);
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

/**
 * Inline broker-search results, shown directly under the search bar the
 * instant there's a query — no extra tap/navigation required. Previously
 * this was a small "Search brokers for…" text link that was easy to miss
 * entirely; showing live results (or a clear "no matches" / "still
 * searching" state) here removes any doubt about whether search is
 * actually doing anything.
 */
function BrokerSearchPanel({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (broker: DisplayBrokerCard) => void;
}) {
  const chatListStyles = useThemedStyles(buildChatListStyles);
  const trimmed = query.trim();
  const brokersQuery = useQuery({
    queryKey: ['display', 'search', trimmed],
    queryFn: () => searchDisplayBrokers(trimmed),
    enabled: trimmed.length > 0,
  });

  if (!trimmed) {
    return null;
  }

  return (
    <View style={chatListStyles.brokerPanel}>
      <Text style={chatListStyles.brokerPanelLabel}>
        Your search: "{trimmed}" — Brokers
      </Text>

      {brokersQuery.isLoading ? (
        <ActivityIndicator
          color={colors.accentBrown}
          style={{ marginVertical: spacing.sm }}
        />
      ) : null}

      {brokersQuery.isError ? (
        <Text style={chatListStyles.brokerPanelError}>
          {errorMessage(brokersQuery.error, 'Could not search right now.')}
        </Text>
      ) : null}

      {brokersQuery.data && brokersQuery.data.length === 0 ? (
        <Text style={chatListStyles.brokerPanelEmpty}>
          No brokers have a live Display post matching "{trimmed}" yet.
        </Text>
      ) : null}

      <View style={chatListStyles.brokerGrid}>
        {brokersQuery.data?.map(broker => (
          <Pressable
            key={broker.userId}
            onPress={() => onSelect(broker)}
            style={({ pressed }) => [
              chatListStyles.brokerCard,
              pressed && chatListStyles.pressed,
            ]}>
            {/* Cover banner — the same photo they set on their Display */}
            <View style={chatListStyles.brokerCardCover}>
              {broker.coverImageUrl ? (
                <Image
                  source={{ uri: broker.coverImageUrl }}
                  style={chatListStyles.brokerCardCoverImg}
                />
              ) : null}
            </View>

            {/* Profile picture, overlapping the cover like a LinkedIn card */}
            <View style={chatListStyles.brokerCardAvatarWrap}>
              {broker.avatarUrl ? (
                <Image source={{ uri: broker.avatarUrl }} style={chatListStyles.brokerCardAvatar} />
              ) : (
                <View style={[chatListStyles.brokerCardAvatar, chatListStyles.brokerAvatarFallback]}>
                  <Text style={chatListStyles.brokerAvatarText}>
                    {broker.displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={chatListStyles.brokerCardBody}>
              <Text style={chatListStyles.brokerName} numberOfLines={1}>
                {broker.displayName}
              </Text>
              <Text style={chatListStyles.brokerDetail} numberOfLines={1}>
                {broker.matchingPost.marlaSize} Marla Plot
              </Text>
              {broker.matchingPost.city || broker.matchingPost.area ? (
                <Text style={chatListStyles.brokerCity} numberOfLines={1}>
                  {[broker.matchingPost.city, broker.matchingPost.area]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              ) : null}

              <View style={chatListStyles.brokerViewBtn}>
                <Text style={chatListStyles.brokerViewBtnText}>View</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ThreadRowAvatar({ thread }: { thread: ChatThread }) {
  const chatListStyles = useThemedStyles(buildChatListStyles);
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
  onLongPress,
}: {
  thread: ChatThread;
  isActive: boolean;
  onPress: (thread: ChatThread) => void;
  onLongPress?: (thread: ChatThread, x: number, y: number) => void;
}) {
  const unreadCount = isActive ? 0 : displayThreadUnread(thread.unreadCount);
  const unreadBadge = formatUnreadBadge(unreadCount);
  const hasUnread = Boolean(unreadBadge);
  const unreadSuffix = unreadBadge ? `, ${unreadBadge} unread` : '';
  const chatListStyles = useThemedStyles(buildChatListStyles);
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
        onLongPress={
          onLongPress
            ? event =>
                onLongPress(thread, event.nativeEvent.pageX, event.nativeEvent.pageY)
            : undefined
        }
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`${thread.title}${unreadSuffix}`}
      />
    </View>
  );
});

export function ChatsListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<ChatsStackParamList, 'ChatList'>>();
  const chatListStyles = useThemedStyles(buildChatListStyles);
  const tabBarHeight = useBottomTabBarHeight();
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const alert = useAppAlert();
  const toast = useAppToast();
  const activeThreadId = useActiveChatThreadStore(s => s.activeThreadId);
  const isGroupMode = route.params?.mode === 'group';
  const screenTitle = route.params?.title ?? (isGroupMode ? 'Group Chat' : 'Views');
  const screenSubtitle =
    route.params?.subtitle ??
    (isGroupMode
      ? 'Community space discussions with members.'
      : 'Community space and private notes with hosts about listings.');

  // Search: a top icon toggles a search bar that filters the visible
  // threads by title. Group Chat gets this per product ask; harmless to
  // leave mounted (but hidden) for the direct list too.
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const closeSearch = React.useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  // "Delete chat" — long-press a row in the private inbox to remove it
  // from this device's list only (see deleteChatThread / hideThreadForUser
  // on the backend). Group threads aren't offered this — leaving a
  // community isn't the same action as hiding a DM.
  const [deleteMenuThread, setDeleteMenuThread] = React.useState<ChatThread | null>(null);
  const [deleteMenuAnchor, setDeleteMenuAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const [deletingThreadId, setDeletingThreadId] = React.useState<string | null>(null);

  const onRowLongPress = React.useCallback(
    (thread: ChatThread, x: number, y: number) => {
      if (thread.type === 'group') {
        return;
      }
      setDeleteMenuThread(thread);
      setDeleteMenuAnchor({ x, y });
    },
    [],
  );

  const runDeleteThread = React.useCallback(
    async (thread: ChatThread) => {
      if (!user) {
        return;
      }
      setDeletingThreadId(thread.id);
      const previous = queryClient.getQueryData<ChatThread[]>(['threads', user.id]);
      // Optimistic removal so the row disappears immediately.
      queryClient.setQueryData<ChatThread[] | undefined>(['threads', user.id], prev =>
        (prev ?? []).filter(t => !sameId(t.id, thread.id)),
      );
      try {
        await deleteChatThread(thread.id);
        toast({ title: 'Chat deleted', kind: 'success' });
      } catch (err) {
        // Roll back on failure so the user doesn't silently lose the thread.
        if (previous) {
          queryClient.setQueryData(['threads', user.id], previous);
        }
        alert({
          title: 'Could not delete chat',
          message: errorMessage(err, 'Please try again.'),
        });
      } finally {
        setDeletingThreadId(null);
      }
    },
    [alert, queryClient, toast, user],
  );

  const confirmDeleteThread = React.useCallback(
    (thread: ChatThread) => {
      alert({
        title: `Delete chat with ${thread.title}?`,
        message: 'This removes the conversation from your inbox. The other person keeps their copy.',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete chat',
            style: 'destructive',
            onPress: () => runDeleteThread(thread),
          },
        ],
      });
    },
    [alert, runDeleteThread],
  );

  const deleteMenuItems: ActionMenuItem[] = React.useMemo(
    () =>
      deleteMenuThread
        ? [
            {
              label: 'Delete chat',
              destructive: true,
              onPress: () => confirmDeleteThread(deleteMenuThread),
            },
          ]
        : [],
    [confirmDeleteThread, deleteMenuThread],
  );

  const threadsQuery = useQuery({
    queryKey: ['threads', user?.id],
    queryFn: () => fetchThreads(user!),
    enabled: !!user,
  });
  const threads = threadsQuery.data ?? [];
  const modeThreads = isGroupMode
    ? threads.filter(thread => thread.type === 'group')
    : threads.filter(thread => thread.type !== 'group');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleThreads = normalizedQuery
    ? modeThreads.filter(thread => thread.title?.toLowerCase().includes(normalizedQuery))
    : modeThreads;
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
        onLongPress={onRowLongPress}
      />
    ),
    [activeThreadId, onRowLongPress, openThread],
  );

  return (
    <SafeAreaView style={chatListStyles.safe} edges={['top', 'left', 'right']}>
      <View style={chatListStyles.header}>
        <View style={chatListStyles.headerTopRow}>
          <View style={chatListStyles.headerTopText}>
            <Text style={getScreenStyles().sectionOverline}>Inbox</Text>
            <Text style={chatListStyles.title}>{screenTitle}</Text>
          </View>
          {isGroupMode ? (
            <Pressable
              onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              hitSlop={12}
              style={({ pressed }) => [
                chatListStyles.searchIconBtn,
                pressed && chatListStyles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? 'Close search' : 'Search group chats'}>
              {searchOpen ? (
                <X color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
              ) : (
                <Search color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
              )}
            </Pressable>
          ) : null}
        </View>
        {searchOpen ? (
          <View style={chatListStyles.searchBar}>
            <Search color={colors.textMuted} size={iconSize.sm} strokeWidth={iconStroke} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search group chats"
              placeholderTextColor={colors.textMuted}
              style={chatListStyles.searchInput}
              autoFocus
              returnKeyType="search"
              accessibilityLabel="Search group chats"
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Clear search">
                <X color={colors.textMuted} size={iconSize.sm} strokeWidth={iconStroke} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={chatListStyles.sub}>{screenSubtitle}</Text>
        )}
        {/* "5 marla plot required" etc. — shows matching brokers live,
            right here, alongside (not instead of) the group-chat name
            filter above, which keeps working on the same query. */}
        {searchOpen ? (
          <BrokerSearchPanel
            query={searchQuery}
            onSelect={broker =>
              navigateToUserDisplayFromSearch(navigation, {
                userId: broker.userId,
                displayName: broker.displayName,
              })
            }
          />
        ) : null}
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
          <Text style={chatListStyles.emptyTitle}>
            {normalizedQuery ? 'No matches' : 'Your inbox is quiet'}
          </Text>
          <Text style={chatListStyles.emptyBody}>
            {normalizedQuery
              ? `No group chats match "${searchQuery.trim()}".`
              : isGroupMode
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
          extraData={`${threadsQuery.dataUpdatedAt}:${activeThreadId ?? ''}:${deletingThreadId ?? ''}`}
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
      <ActionMenu
        visible={Boolean(deleteMenuThread)}
        onClose={() => {
          setDeleteMenuThread(null);
          setDeleteMenuAnchor(null);
        }}
        anchor={deleteMenuAnchor}
        items={deleteMenuItems}
      />
    </SafeAreaView>
  );
}

const buildChatListStyles = () => StyleSheet.create({
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTopText: { flex: 1, gap: spacing.xs },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingHorizontal: spacing.md,
    minHeight: layout.buttonHeightMin,
  },
  brokerPanel: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: layout.radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  brokerPanelLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  brokerPanelError: {
    ...typography.bodySmall,
    color: colors.danger,
  },
  brokerPanelEmpty: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  // LinkedIn-card-style grid: two per row, cover photo with the profile
  // picture overlapping it, name + spec + city below.
  brokerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  brokerCard: {
    width: '47%',
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingBottom: spacing.sm,
  },
  brokerCardCover: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primarySoft,
  },
  brokerCardCoverImg: {
    width: '100%',
    height: '100%',
  },
  brokerCardAvatarWrap: {
    marginTop: -24,
    marginLeft: spacing.sm,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.surface,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  brokerCardAvatar: {
    width: '100%',
    height: '100%',
  },
  brokerAvatarFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokerAvatarText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  brokerCardBody: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    gap: 2,
  },
  brokerName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  brokerDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  brokerCity: {
    ...typography.caption,
    color: colors.textMuted,
  },
  brokerViewBtn: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: layout.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
  },
  brokerViewBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 10,
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
