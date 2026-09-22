import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import RNShare from 'react-native-share';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  Phone,
  Plus,
  Share2,
  Tag,
  Trash2,
  SquarePen,
} from 'lucide-react-native';
import {
  createDirectChatFromCommunityAd,
  deleteDisplayPost,
  errorMessage,
  fetchMyDisplayPosts,
  fetchMyDisplayProfile,
  fetchUserDisplayPosts,
  fetchUserDisplayProfile,
  markDisplayPostSold,
  sendChatMessage,
  setMyDisplayCover,
} from '../../api/client';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { pickProfileAvatar } from '../../lib/pickListingImages';
import { useAppAlert } from '../../components/appAlert';
import { navigateToChatsThread } from '../../navigation/crossTabNavigate';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import type { DisplayPost } from '../../types/models';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const OPTIONAL_FIELD_LABELS: Record<string, string> = {
  bedrooms: 'Bed',
  bathrooms: 'Bath',
  kitchen: 'Kitchen',
  carporch: 'Carporch',
  tvLounge: 'TV Lounge',
};

function summarizeFields(post: DisplayPost): string {
  const parts = [`${post.marlaSize} Marla`];
  if (post.city) parts.push(post.city);
  if (post.area) parts.push(post.area);
  for (const [key, label] of Object.entries(OPTIONAL_FIELD_LABELS)) {
    const value = post.extraFields?.[key];
    if (value) {
      parts.push(key === 'bedrooms' || key === 'bathrooms' ? `${value} ${label}` : label);
    }
  }
  return parts.join(' · ');
}

/** "23h 40m left" / "45m left" — how much longer this paid post keeps running. */
function formatRemainingTime(remainingSeconds: number | null | undefined): string | null {
  if (remainingSeconds === null || remainingSeconds === undefined) {
    return null;
  }
  if (remainingSeconds <= 0) {
    return null;
  }
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  if (hours >= 1) {
    return `${hours}h ${minutes}m left`;
  }
  if (minutes >= 1) {
    return `${minutes}m left`;
  }
  return 'Less than a minute left';
}

/** Horizontal swipe carousel for one post's photos, with a small "2/5" counter — the spec's "1/5 or 5x5 small label" requirement. */
function PostImageCarousel({ images, width }: { images: string[]; width: number }) {
  const styles = useThemedStyles(buildStyles);
  const [page, setPage] = useState(0);
  const height = Math.round(width * 0.72);

  if (images.length === 0) {
    return <View style={[styles.carouselEmpty, { width, height }]} />;
  }

  return (
    <View style={{ width, height }}>
      <FlatList
        data={images}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(idx);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height }} resizeMode="cover" />
        )}
      />
      {images.length > 1 ? (
        <View style={styles.carouselCounter}>
          <Text style={styles.carouselCounterText}>
            {page + 1}/{images.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function DisplayScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  // `useRoute()`'s generic parameter is purely a TypeScript cast — both
  // calls below return the exact same underlying route object at runtime
  // (whichever screen this component is actually mounted as), so a single
  // untyped call plus a name check is the honest, non-misleading way to
  // read it rather than two differently-"typed" calls that look like they
  // read two different things.
  const route = useRoute();
  const isOwn = route.name === 'MyDisplay';
  const params = route.params as { userId?: string; displayName?: string } | undefined;
  const targetUserId = isOwn ? undefined : params?.userId;
  const targetName = isOwn ? undefined : params?.displayName;

  const { width: windowWidth } = useWindowDimensions();
  const carouselWidth = windowWidth - layout.screenPaddingHorizontal * 2;

  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const alert = useAppAlert();
  const [coverUploading, setCoverUploading] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['display', 'profile', isOwn ? 'mine' : targetUserId],
    queryFn: () => (isOwn ? fetchMyDisplayProfile() : fetchUserDisplayProfile(targetUserId!)),
  });

  const postsQuery = useQuery({
    queryKey: ['display', 'posts', isOwn ? 'mine' : targetUserId],
    queryFn: () => (isOwn ? fetchMyDisplayPosts() : fetchUserDisplayPosts(targetUserId!)),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['display'] });
  }, [queryClient]);

  const onChangeCover = async () => {
    const uri = await pickProfileAvatar();
    if (!uri) return;
    setCoverUploading(true);
    try {
      const url = await uploadImageToCloudinary(uri);
      await setMyDisplayCover(url);
      invalidate();
    } catch (err) {
      alert({ title: 'Could not update cover', message: errorMessage(err) });
    } finally {
      setCoverUploading(false);
    }
  };

  const onDelete = (post: DisplayPost) => {
    alert({
      title: 'Delete this post?',
      message: 'This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDisplayPost(post.id);
              invalidate();
            } catch (err) {
              alert({ title: 'Could not delete', message: errorMessage(err) });
            }
          },
        },
      ],
    });
  };

  const onMarkSold = (post: DisplayPost) => {
    alert({
      title: 'Mark as Sold?',
      message: 'This post will show a SOLD badge until it expires.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await markDisplayPostSold(post.id);
              invalidate();
            } catch (err) {
              alert({ title: 'Could not update', message: errorMessage(err) });
            }
          },
        },
      ],
    });
  };

  const onOffer = async (post: DisplayPost) => {
    if (!user) {
      return;
    }
    try {
      const thread = await createDirectChatFromCommunityAd(post.userId);
      // Send the whole post — photos and specs — as a message right away,
      // the same way a Community ad card shows up in chat, so the two of
      // them have something concrete to discuss instead of a bare text
      // line. `kind: 'display'` is what makes the card render "Marla"
      // instead of a city and route "tap to view" to the broker's
      // Display rather than Community post details.
      await sendChatMessage(
        thread.id,
        user,
        'Shared a Display post',
        undefined,
        undefined,
        undefined,
        {
          id: post.id,
          title: `${post.marlaSize} Marla`,
          description: post.description ?? summarizeFields(post),
          city: '',
          images: post.images,
          authorId: post.userId,
          authorName: post.authorName,
          authorAvatarUrl: post.authorAvatarUrl,
          kind: 'display',
          marlaSize: post.marlaSize,
        },
      );
      navigateToChatsThread(navigation, {
        threadId: thread.id,
        title: post.authorName,
        // Prefilled but not auto-sent — the post itself already went
        // through above; this just gives them a starting line to edit
        // and send themselves.
        initialDraft: `Hi, I'm interested in your ${post.marlaSize} Marla listing.`,
      });
    } catch (err) {
      alert({ title: 'Could not open chat', message: errorMessage(err) });
    }
  };

  const onCall = (post: DisplayPost) => {
    const phone = post.authorPhone?.trim();
    if (!phone) {
      alert({
        title: 'No phone number',
        message: `${post.authorName} hasn't added a phone number to their profile yet.`,
      });
      return;
    }
    void Linking.openURL(`tel:${phone}`).catch(() => {
      alert({ title: "Couldn't open dialer", message: 'Try calling from your Phone app.' });
    });
  };

  const onShare = async (post: DisplayPost) => {
    const summary = `${post.marlaSize} Marla — ${post.authorName} on Brokage${
      post.description ? `\n${post.description}` : ''
    }`;
    const firstImage = post.images[0];
    if (!firstImage) {
      // No photo to attach — plain text share is still useful.
      void Share.share({ message: summary });
      return;
    }
    try {
      // The native share sheet (WhatsApp, etc.) needs actual image bytes,
      // not just a remote URL it can't fetch itself — so the photo is
      // downloaded and inlined as a base64 data URI before handing it to
      // the share sheet. This is what makes "share" actually attach the
      // picture, not just post a link.
      const response = await fetch(firstImage);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await RNShare.open({
        title: 'Share listing',
        message: summary,
        url: base64,
        failOnCancel: false,
      });
    } catch {
      // Falls back to a text-only share rather than leaving the tap
      // feeling like it did nothing (e.g. image fetch failed offline).
      void Share.share({ message: summary });
    }
  };

  const posts = postsQuery.data ?? [];
  const cover = profileQuery.data?.coverImageUrl ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ArrowLeft color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isOwn ? 'My Display' : (targetName ?? 'Display')}
        </Text>
        <View style={{ width: iconSize.md }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Cover — Facebook-style, top of the Display */}
            <Pressable
              onPress={isOwn ? onChangeCover : undefined}
              style={styles.cover}
              disabled={!isOwn}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.coverImg} resizeMode="cover" />
              ) : (
                <View style={styles.coverEmpty}>
                  {isOwn ? (
                    <>
                      <Camera color={colors.textMuted} size={iconSize.lg} strokeWidth={iconStroke} />
                      <Text style={styles.coverEmptyText}>Add a cover photo</Text>
                    </>
                  ) : null}
                </View>
              )}
              {coverUploading ? (
                <View style={styles.coverUploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>

            {isOwn ? (
              <Pressable
                onPress={() => navigation.navigate('CreateDisplayPost', undefined)}
                style={styles.addPostBtn}
                accessibilityRole="button"
                accessibilityLabel="Add post">
                <Plus color={colors.onPrimary} size={iconSize.md} strokeWidth={iconStroke} />
                <Text style={styles.addPostBtnText}>Add Post</Text>
              </Pressable>
            ) : null}

            {postsQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
            ) : null}
            {postsQuery.isError ? (
              <Text style={styles.errorText}>
                {errorMessage(postsQuery.error, 'Could not load posts.')}
              </Text>
            ) : null}
            {postsQuery.data && posts.length === 0 ? (
              <Text style={styles.emptyText}>
                {isOwn ? 'No posts yet — tap "Add Post" to create one.' : 'No posts to show yet.'}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item: post }) => {
          const isSold = post.status === 'sold';
          const isPending = post.status === 'pending';
          const isExpired = post.status === 'expired';
          const isRejected = post.status === 'rejected';
          const remainingLabel = formatRemainingTime(post.remainingSeconds);
          return (
            <View style={styles.postCard}>
              <PostImageCarousel images={post.images} width={carouselWidth} />

              {isSold ? (
                <View style={[styles.statusBadge, styles.statusBadgeSold]}>
                  <Text style={styles.statusBadgeText}>SOLD</Text>
                </View>
              ) : isExpired ? (
                <View style={[styles.statusBadge, styles.statusBadgeExpired]}>
                  <Text style={styles.statusBadgeText}>EXPIRED</Text>
                </View>
              ) : isRejected && isOwn ? (
                <View style={[styles.statusBadge, styles.statusBadgeExpired]}>
                  <Text style={styles.statusBadgeText}>Rejected</Text>
                </View>
              ) : isPending && isOwn ? (
                <View style={[styles.statusBadge, styles.statusBadgePending]}>
                  <Text style={styles.statusBadgeText}>Pending review</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgeActive]}>
                  <Text style={styles.statusBadgeText}>Active</Text>
                </View>
              )}

              {/* Live countdown — "23h 40m left" — only meaningful for a
                  verified, still-running post; sold/expired/pending posts
                  don't have a ticking timer worth showing here. */}
              {remainingLabel && (post.status === 'active' || post.status === 'sold') ? (
                <View style={styles.remainingBadge}>
                  <Text style={styles.remainingBadgeText}>{remainingLabel}</Text>
                </View>
              ) : null}

              <View style={styles.postBody}>
                <Text style={styles.postSummary}>{summarizeFields(post)}</Text>
                {post.description ? (
                  <Text style={styles.postDescription} numberOfLines={3}>
                    {post.description}
                  </Text>
                ) : null}
              </View>

              {isOwn ? (
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => onMarkSold(post)}
                    disabled={isSold || isExpired}
                    style={[styles.actionBtn, (isSold || isExpired) && styles.actionBtnDisabled]}>
                    <Tag color={colors.textPrimary} size={iconSize.sm} strokeWidth={iconStroke} />
                    <Text style={styles.actionBtnText}>Sold</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('CreateDisplayPost', { editPost: post })
                    }
                    style={styles.actionBtn}>
                    <SquarePen color={colors.textPrimary} size={iconSize.sm} strokeWidth={iconStroke} />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => onDelete(post)} style={styles.actionBtn}>
                    <Trash2 color={colors.danger} size={iconSize.sm} strokeWidth={iconStroke} />
                    <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => onOffer(post)} style={styles.actionBtn}>
                    <Tag color={colors.textPrimary} size={iconSize.sm} strokeWidth={iconStroke} />
                    <Text style={styles.actionBtnText}>Offer</Text>
                  </Pressable>
                  <Pressable onPress={() => onCall(post)} style={styles.actionBtn}>
                    <Phone color={colors.textPrimary} size={iconSize.sm} strokeWidth={iconStroke} />
                    <Text style={styles.actionBtnText}>Call</Text>
                  </Pressable>
                  <Pressable onPress={() => onShare(post)} style={styles.actionBtn}>
                    <Share2 color={colors.textPrimary} size={iconSize.sm} strokeWidth={iconStroke} />
                    <Text style={styles.actionBtnText}>Share</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const buildStyles = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.topBar,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.topBarBorder,
    },
    headerTitle: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.sm,
    },
    listContent: { paddingBottom: spacing.xxl },
    cover: {
      width: '100%',
      height: 180,
      backgroundColor: colors.surfaceMuted,
    },
    coverImg: { width: '100%', height: '100%' },
    coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    coverEmptyText: { ...typography.caption, color: colors.textMuted },
    coverUploadingOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      marginHorizontal: layout.screenPaddingHorizontal,
      marginTop: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: layout.radius.md,
    },
    addPostBtnText: { ...typography.body, fontWeight: '700', color: colors.onPrimary },
    errorText: {
      ...typography.bodySmall,
      color: colors.danger,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    emptyText: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: layout.screenPaddingHorizontal,
    },
    postCard: {
      marginTop: spacing.lg,
      marginHorizontal: layout.screenPaddingHorizontal,
      borderRadius: layout.radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    carouselEmpty: { backgroundColor: colors.surfaceMuted },
    carouselCounter: {
      position: 'absolute',
      right: spacing.sm,
      bottom: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: layout.radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    carouselCounterText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    statusBadge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: layout.radius.sm,
    },
    statusBadgeSold: { backgroundColor: colors.danger },
    statusBadgePending: { backgroundColor: colors.accentBrown },
    statusBadgeActive: { backgroundColor: colors.success },
    statusBadgeExpired: { backgroundColor: colors.textMuted },
    statusBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
    remainingBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: layout.radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    remainingBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    postBody: { padding: spacing.md, gap: 4 },
    postSummary: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
    postDescription: { ...typography.bodySmall, color: colors.textSecondary },
    actionsRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.sm + 2,
    },
    actionBtnDisabled: { opacity: 0.4 },
    actionBtnText: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  });
