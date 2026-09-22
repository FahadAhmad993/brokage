import type { NativeBottomTabNavigationProp } from '@bottom-tabs/react-navigation';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bath, Bed, ImageOff, MapPin, Maximize2, Star } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createOrOpenDirectThread,
  fetchProperty,
  openDirectThreadForListing,
} from '../../api/client';
import { GradientButton } from '../../components/GradientButton';
import { propertyGalleryUrls } from '../../lib/propertyImages';
import {
  formatCoreStatLabel,
  partitionPropertyFeatures,
} from '../../utils/propertyFeatures';
import { navigateToChatsThread } from '../../navigation/crossTabNavigate';
import type { HomeStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useMyListingsStore } from '../../stores/myListingsStore';
import type { ChatThread } from '../../types/models';
import { colors } from '../../theme/colors';
import { getScreenStyles } from '../../theme/screenStyles';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type R = RouteProp<HomeStackParamList, 'PropertyDetail'>;
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'PropertyDetail'>,
  NativeBottomTabNavigationProp<MainTabParamList>
>;

const DEFAULT_ABOUT =
  'Detailed description, amenities, and availability will appear here once connected to your content source.';

const STICKY_BUTTON_ROW = 40;

/** Time between automatic slide changes (multi-image only). */
const GALLERY_AUTO_INTERVAL_MS = 4500;
/** After the user swipes the gallery, pause auto-play for this long. */
const GALLERY_AUTO_PAUSE_AFTER_DRAG_MS = 9000;

/**
 * Inside a tab, `insets.bottom` can be large while the tab bar already clears the
 * home indicator — cap padding so the CTA sits closer to the tab bar.
 */
function footerBottomPad(insetsBottom: number, tabBarHeight: number) {
  if (tabBarHeight > 0) {
    return Math.min(Math.max(insetsBottom, 2), 10);
  }
  return Math.max(insetsBottom, 4);
}

function stickyFooterHeight(insetsBottom: number, tabBarHeight: number) {
  return STICKY_BUTTON_ROW + footerBottomPad(insetsBottom, tabBarHeight);
}

function CoreStatGlyph({ icon }: { icon?: string }) {
  const common = {
    size: iconSize.md,
    color: colors.primary,
    strokeWidth: iconStroke,
  } as const;
  switch (icon) {
    case 'bed':
      return <Bed {...common} />;
    case 'bath':
      return <Bath {...common} />;
    case 'sqft':
      return <Maximize2 {...common} />;
    default:
      return null;
  }
}

function truncateNavTitle(title: string, max = 34) {
  const t = title.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

function PropertyImagePager({
  resetKey,
  urls,
  width,
  height,
  listingTitle,
  priceOverlay,
}: {
  resetKey: string;
  urls: string[];
  width: number;
  height: number;
  listingTitle: string;
  priceOverlay: React.ReactNode;
}) {
  const styles = useThemedStyles(buildStyles);
  const [page, setPage] = useState(0);
  const multi = urls.length > 1;
  const listRef = useRef<FlatList<string>>(null);
  const pageRef = useRef(0);
  const pauseAutoUntilRef = useRef(0);

  useEffect(() => {
    pageRef.current = 0;
    setPage(0);
    pauseAutoUntilRef.current = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [resetKey, width]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const syncPageFromOffset = useCallback(
    (x: number) => {
      if (!multi) {
        return;
      }
      const i = Math.round(x / Math.max(1, width));
      const clamped = Math.max(0, Math.min(urls.length - 1, i));
      pageRef.current = clamped;
      setPage(clamped);
    },
    [multi, urls.length, width],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncPageFromOffset(e.nativeEvent.contentOffset.x);
    },
    [syncPageFromOffset],
  );

  const onScrollBeginDrag = useCallback(() => {
    pauseAutoUntilRef.current = Date.now() + GALLERY_AUTO_PAUSE_AFTER_DRAG_MS;
  }, []);

  useEffect(() => {
    if (!multi) {
      return;
    }
    const tick = () => {
      if (Date.now() < pauseAutoUntilRef.current) {
        return;
      }
      const n = urls.length;
      if (n < 2) {
        return;
      }
      const next = (pageRef.current + 1) % n;
      pageRef.current = next;
      setPage(next);
      listRef.current?.scrollToOffset({
        offset: next * width,
        animated: true,
      });
    };
    const id = setInterval(tick, GALLERY_AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [multi, urls.length, width, resetKey]);

  if (urls.length === 0) {
    return (
      <View
        style={[styles.heroShell, styles.heroEmpty, { width, height }]}
        accessibilityLabel={`${listingTitle}, no photos`}
        accessibilityRole="image">
        <ImageOff
          color={colors.textMuted}
          size={36}
          strokeWidth={1.5}
        />
        <Text style={styles.heroEmptyText}>Photos coming soon</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.heroShell, { width, height }]}
      accessibilityLabel={
        multi
          ? `${listingTitle}, ${urls.length} photos, showing ${page + 1}`
          : `${listingTitle} photo`
      }
      accessibilityRole="image">
      <FlatList
        ref={listRef}
        data={urls}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        bounces={multi}
        decelerationRate="fast"
        keyExtractor={(_, i) => `${resetKey}-g-${i}`}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={[styles.heroSlide, { width, height }]}>
            <Image
              source={{ uri: item }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={onScrollBeginDrag}
        style={[styles.heroPager, { width }]}
      />
      {priceOverlay}
      {multi ? (
        <View style={styles.heroMeta} pointerEvents="none">
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {page + 1} / {urls.length}
            </Text>
          </View>
          <View style={styles.dotsWrap}>
            {urls.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  i === page ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function PropertyDetailScreen() {
  const styles = useThemedStyles(buildStyles);
  const { width: windowWidth } = useWindowDimensions();
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { propertyId } = route.params;
  const slideWidth = windowWidth - 2 * layout.screenPaddingHorizontal;
  /** ~4:3 gallery, capped so photos stay prominent (aligned with readable body below). */
  const heroHeight = Math.min(Math.round(slideWidth * (3 / 4)), 340);
  const user = useAuthStore(s => s.user);
  const managed = useMyListingsStore(s =>
    s.listings.find(l => l.id === propertyId),
  );

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => fetchProperty(propertyId),
  });

  const isOwner = Boolean(user && managed && managed.ownerId === user.id);
  const lister = property?.lister;
  const canMessageHost =
    Boolean(user && lister && lister.id !== user.id && !isOwner);

  const bottomPad = footerBottomPad(insets.bottom, tabBarHeight);

  useLayoutEffect(() => {
    if (isLoading) {
      navigation.setOptions({
        title: 'Listing',
        headerBackTitle: 'Home',
      });
      return;
    }
    if (!property) {
      navigation.setOptions({
        title: 'Unavailable',
        headerBackTitle: 'Home',
      });
      return;
    }
    navigation.setOptions({
      title: truncateNavTitle(property.title),
      headerBackTitle: 'Home',
    });
  }, [isLoading, property, navigation]);

  const onMessageHost = async () => {
    if (!property || !user || !canMessageHost) {
      return;
    }
    const thread =
      property.lister.id && property.id
        ? await createOrOpenDirectThread(
            property.lister.displayName,
            property.lister.id,
            {
              id: property.id,
              title: property.title,
              imageUrl: property.imageUrl,
              location: property.location,
              priceMonthly: property.priceMonthly,
            },
          ).catch(() => openDirectThreadForListing(property.lister, property, user))
        : openDirectThreadForListing(property.lister, property, user);
    queryClient.setQueryData(
      ['threads', user.id],
      (prev: ChatThread[] | undefined) => {
        const list = prev ?? [];
        const existingIdx = list.findIndex(t => t.id === thread.id);
        if (existingIdx >= 0) {
          const next = [...list];
          next[existingIdx] = {
            ...next[existingIdx],
            ...thread,
          };
          return next;
        }
        return [thread, ...list];
      },
    );
    queryClient.invalidateQueries({ queryKey: ['threads', user.id] });
    queryClient.invalidateQueries({ queryKey: ['messages', thread.id] });
    navigateToChatsThread(navigation, {
      threadId: thread.id,
      title: thread.title,
      relatedListing: thread.relatedListing,
    });
  };

  const scrollBottomPad = canMessageHost
    ? stickyFooterHeight(insets.bottom, tabBarHeight) + 2
    : spacing.md + bottomPad;

  const galleryUrls = useMemo(() => {
    if (!property) {
      return [] as string[];
    }
    const u = propertyGalleryUrls(property);
    return u.length > 0 ? u : [property.imageUrl];
  }, [property]);

  const [aboutExpanded, setAboutExpanded] = useState(false);

  useEffect(() => {
    setAboutExpanded(false);
  }, [propertyId]);

  const featureParts = useMemo(
    () => partitionPropertyFeatures(property?.features ?? []),
    [property?.features],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            styles.scrollContentGrow,
            { paddingTop: spacing.md, paddingBottom: scrollBottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.muted}>Loading listing…</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: spacing.md, paddingBottom: scrollBottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.notFoundTitle}>Listing unavailable</Text>
          <Text style={styles.body}>
            This listing may have been removed or is no longer published.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const aboutCopy = property.description?.trim() || DEFAULT_ABOUT;
  const aboutLong = aboutCopy.length > 220;

  const priceOverlay = (
    <View style={styles.pricePill} pointerEvents="none">
      <Text style={styles.price}>
        ${property.priceMonthly.toLocaleString()}
      </Text>
      <Text style={styles.per}>/mo</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: spacing.md,
              paddingBottom: scrollBottomPad,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}>
          {isOwner && managed ? (
            <View style={styles.ownerBanner}>
              <View style={styles.ownerTop}>
                <Text style={styles.ownerLabel}>Your listing</Text>
                <View
                  style={[
                    styles.statusPill,
                    managed.status === 'paused' && styles.statusPillMuted,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      managed.status === 'paused' && styles.statusTextMuted,
                    ]}>
                    {managed.status === 'live' ? 'Live' : 'Paused'}
                  </Text>
                </View>
              </View>
              <Text style={styles.ownerHint}>
                Manage visibility and details from Your listings.
              </Text>
              <Pressable
                onPress={() => navigation.navigate('MyListings')}
                accessibilityRole="button"
                accessibilityLabel="Open your listings">
                <Text style={styles.ownerLink}>Open Your listings</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.hero}>
            <PropertyImagePager
              resetKey={property.id}
              urls={galleryUrls}
              width={slideWidth}
              height={heroHeight}
              listingTitle={property.title}
              priceOverlay={priceOverlay}
            />
          </View>

          <View
            style={styles.titleBlock}
            accessible
            accessibilityLabel={`${property.title}. ${property.location}. ${property.priceMonthly} dollars per month.`}>
            <View style={styles.titleRow}>
              <Text style={styles.listingTitle} numberOfLines={3}>
                {property.title}
              </Text>
              {property.isPremium ? (
                <View style={styles.premiumPill}>
                  <Star
                    size={12}
                    color={colors.accentBrown}
                    fill={colors.accentBrown}
                    strokeWidth={2}
                  />
                  <Text style={styles.premiumPillText}>PREMIUM</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.metaRow}>
              <MapPin
                size={iconSize.sm}
                color={colors.textMuted}
                strokeWidth={iconStroke}
              />
              <Text style={styles.metaLocation} numberOfLines={2}>
                {property.location}
              </Text>
            </View>
          </View>

          {featureParts.core.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>At a glance</Text>
              <View style={styles.statsCard}>
                <View style={styles.statsRow}>
                  {featureParts.core.map((f, i) => (
                    <View
                      key={f.icon ?? f.label}
                      style={[
                        styles.statItem,
                        i === featureParts.core.length - 1 && styles.statItemLast,
                      ]}>
                      <CoreStatGlyph icon={f.icon} />
                      <Text style={styles.statItemText}>
                        {formatCoreStatLabel(f)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {featureParts.other.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>
                {featureParts.core.length > 0 ? 'Amenities' : 'Details'}
              </Text>
              <View style={styles.amenityCard}>
                <View style={styles.amenityWrap}>
                  {featureParts.other.map(f => (
                    <View key={f.label} style={styles.amenityTag}>
                      <Text style={styles.amenityTagText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {lister && !isOwner ? (
            <View
              style={styles.hostCard}
              accessible
              accessibilityLabel={`Listed by ${lister.displayName}`}>
              <Text style={styles.sectionLabel}>Host</Text>
              <View style={styles.hostRow}>
                {lister.avatarUrl ? (
                  <Image
                    source={{ uri: lister.avatarUrl }}
                    style={styles.hostAvatar}
                    accessibilityLabel={`${lister.displayName} profile photo`}
                  />
                ) : (
                  <View style={styles.hostAvatarFallback}>
                    <Text style={styles.hostInitial}>
                      {lister.displayName.trim().charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.hostMeta}>
                  <Text style={styles.hostName} numberOfLines={1}>
                    {lister.displayName}
                  </Text>
                  {lister.bio ? (
                    <Text style={styles.hostBio} numberOfLines={1}>
                      {lister.bio}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionBlockLast}>
            <Text style={styles.sectionLabel}>About</Text>
            <View style={styles.aboutPanel}>
              <Text
                style={styles.aboutBody}
                numberOfLines={
                  aboutLong && !aboutExpanded ? 5 : undefined
                }>
                {aboutCopy}
              </Text>
              {aboutLong ? (
                <Pressable
                  onPress={() => setAboutExpanded(e => !e)}
                  style={styles.readMoreBtn}
                  accessibilityRole="button"
                  accessibilityLabel={
                    aboutExpanded ? 'Show less description' : 'Read full description'
                  }>
                  <Text style={styles.readMoreText}>
                    {aboutExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>

        {canMessageHost ? (
          <View
            style={[
              styles.stickyFooter,
              { paddingBottom: bottomPad },
            ]}
            accessibilityRole="toolbar"
            accessibilityLabel="Contact host">
            <GradientButton
              toolbar
              label="Message host"
              onPress={onMessageHost}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const buildStyles = () => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
  scrollContentGrow: {
    flexGrow: 1,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  muted: { ...typography.body, color: colors.textMuted },
  notFoundTitle: {
    ...getScreenStyles().screenTitle,
    marginBottom: spacing.sm,
  },
  ownerBanner: {
    ...getScreenStyles().card,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderColor: colors.ringPrimary,
  },
  ownerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ownerLabel: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  statusPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPillMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  statusTextMuted: {
    color: colors.textSecondary,
  },
  ownerHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ownerLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  hero: {
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  heroShell: {
    borderRadius: layout.radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  heroPager: { flexGrow: 0, alignSelf: 'center' },
  heroEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroEmptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  heroSlide: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    alignItems: 'center',
    gap: 8,
  },
  photoCounter: {
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: layout.radius.full,
  },
  photoCounterText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#fff',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  pricePill: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.overlayOnPhoto,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    ...shadows.cardSubtle,
  },
  price: {
    ...typography.headline,
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  per: {
    ...typography.bodySmall,
    fontSize: 13,
    opacity: 0.7,
    marginLeft: 4,
    fontWeight: '600',
  },
  titleBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listingTitle: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: layout.radius.sm,
    backgroundColor: colors.tipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tipBorder,
    marginTop: 2,
  },
  premiumPillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: colors.accentBrown,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  metaLocation: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  sectionLabel: {
    ...getScreenStyles().sectionOverline,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sectionBlock: {
    marginBottom: layout.sectionGap,
    gap: spacing.sm,
  },
  sectionBlockLast: {
    marginBottom: 0,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.cardSubtle,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.divider,
    minWidth: 72,
  },
  statItemLast: {
    borderRightWidth: 0,
  },
  statItemText: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.05,
  },
  amenityCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.cardSubtle,
  },
  amenityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.sm,
  },
  amenityTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius.full,
    backgroundColor: colors.washPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ringPrimaryMid,
    maxWidth: '100%',
  },
  amenityTagText: {
    ...typography.label,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hostCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: layout.sectionGap,
    gap: spacing.sm,
    ...shadows.cardSubtle,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  hostAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadows.cardSubtle,
  },
  hostInitial: {
    ...typography.headline,
    color: colors.primary,
  },
  hostMeta: { flex: 1, minWidth: 0, gap: spacing.xs },
  hostName: {
    ...typography.headline,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hostBio: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
    fontWeight: '500',
  },
  aboutPanel: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  aboutBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  readMoreText: {
    ...typography.label,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingHorizontal,
    alignItems: 'stretch',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
});
