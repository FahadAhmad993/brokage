import type { NativeBottomTabNavigationProp } from '@bottom-tabs/react-navigation';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
// import { Map } from 'lucide-react-native'; // Re-enable with map FAB (paid scope)
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchProperties } from '../../api/client';
import { GradientButton } from '../../components/GradientButton';
import { PropertyCard } from '../../components/PropertyCard';
import { navigateToProfileHome } from '../../navigation/crossTabNavigate';
import type { HomeStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import type { PropertyCategory } from '../../types/models';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { screenStyles } from '../../theme/screenStyles';
import { typography } from '../../theme/typography';
import { initialsFromDisplay } from '../../utils/userDisplay';

const FILTERS: { key: PropertyCategory; label: string }[] = [
  { key: 'all', label: 'All Homes' },
  { key: 'urban_lofts', label: 'Urban Lofts' },
  { key: 'villas', label: 'Villas' },
  { key: 'shared', label: 'Shared' },
];

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'Home'>,
  NativeBottomTabNavigationProp<MainTabParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const [category, setCategory] = useState<PropertyCategory>('all');

  const initials = useMemo(
    () => initialsFromDisplay(user?.displayName, user?.email),
    [user?.displayName, user?.email],
  );
  /** Tab bar + home indicator — only for scroll padding (scene bottom is already above the bar). */
  const bottomInset = tabBarHeight + Math.max(insets.bottom, 8);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', category, user?.id],
    queryFn: () => fetchProperties(category, user?.id),
  });

  const sorted = useMemo(() => properties, [properties]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View style={styles.wordmarkWrap}>
          <Text style={styles.wordmark} numberOfLines={1}>
            Brokage
          </Text>
        </View>
        <Pressable
          onPress={() => navigateToProfileHome(navigation)}
          hitSlop={layout.hitSlop}
          style={styles.avatarWrap}
          accessibilityRole="button"
          accessibilityLabel="Open profile">
          <View style={styles.avatar}>
            {user?.avatarUri ? (
              <Image source={{ uri: user.avatarUri }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomInset + spacing.lg,
            paddingHorizontal: layout.screenPaddingHorizontal,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        <View style={styles.heroBlock}>
          <View style={styles.headlineBlock}>
            <Text style={styles.headlineMuted}>Find your next</Text>
            <Text style={styles.headlineAccent}>Curated Brokage</Text>
          </View>
        </View>

        <View style={styles.chipsOuter}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
            keyboardShouldPersistTaps="handled"
            {...(Platform.OS === 'android'
              ? ({ overScrollMode: 'never' } as const)
              : {})}>
            {FILTERS.map(f => {
              const active = category === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setCategory(f.key)}
                  style={({ pressed }) => [
                    styles.chipPress,
                    active ? styles.chipPressActive : styles.chipPressInactive,
                    pressed && styles.chipPressDim,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Filter ${f.label}`}>
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : styles.chipTextInactive,
                    ]}
                    {...(Platform.OS === 'android'
                      ? { includeFontPadding: false }
                      : {})}
                    numberOfLines={1}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>


        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loading}>Loading homes…</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No listings in this view</Text>
            <Text style={styles.emptyBody}>
              Try another category or list a property to get started.
            </Text>
            <GradientButton
              label="Add a listing"
              onPress={() => navigation.navigate('AddProperty')}
              style={styles.emptyCta}
            />
          </View>
        ) : (
          <>
            <Text
              style={[screenStyles.sectionOverline, styles.feedOverline]}
              accessibilityRole="header">
              Homes for you
            </Text>
            <View style={styles.feed}>
              {sorted.map(p => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onPress={() =>
                    navigation.navigate('PropertyDetail', { propertyId: p.id })
                  }
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/*
        Map explore FAB — out of scope until client funds map work. Re-enable with:
        - import { Map } from 'lucide-react-native'; import { iconStroke } from '../../theme/icons'
        - fabFromSceneBottom = spacing.lg + spacing.xs
        - paddingBottom: bottomInset + spacing.xl + layout.fab.size + spacing.md
        - MapExplore screen + type in navigation
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabFromSceneBottom },
          pressed && styles.fabPressed,
        ]}
        hitSlop={layout.hitSlop}
        onPress={() => navigation.navigate('MapExplore')}
        accessibilityRole="button"
        accessibilityLabel="Map"
        accessibilityHint="Explore listings on the map">
        <LinearGradient
          colors={[colors.primary, colors.primaryMid]}
          style={styles.fabGrad}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}>
          <Map
            color={colors.onPrimary}
            size={layout.fab.iconArea}
            strokeWidth={iconStroke}
          />
        </LinearGradient>
      </Pressable>
      */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  wordmarkWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  wordmark: {
    ...typography.headline,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
    color: colors.brandWordmark,
  },
  avatarWrap: {
    borderWidth: 2,
    borderColor: colors.primarySoft,
    borderRadius: 999,
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 13,
    color: colors.primary,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
    flexGrow: 1,
  },
  heroBlock: {
    gap: spacing.sm,
  },
  headlineBlock: {
    gap: 2,
    marginBottom: spacing.xs,
  },
  headlineMuted: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  headlineAccent: {
    ...typography.displayMedium,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.35,
  },
  chipsOuter: {
    marginHorizontal: -layout.screenPaddingHorizontal,
    marginTop: -spacing.xs,
  },
  chipsScroll: {
    flexGrow: 0,
    minHeight: layout.chipHeight + 4,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: 2,
    gap: 10,
  },
  chipPress: {
    flexShrink: 0,
    alignSelf: 'center',
    minHeight: layout.chipHeight,
    paddingHorizontal: layout.chip.paddingH,
    paddingVertical: layout.chip.paddingV,
    borderRadius: layout.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressActive: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  chipPressInactive: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ringPrimaryMid,
  },
  chipPressDim: { opacity: 0.92 },
  chipText: {
    ...typography.label,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  chipTextInactive: {
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  loading: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  empty: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyCta: { alignSelf: 'stretch', marginTop: spacing.sm },
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
  },
  feed: {
    gap: spacing.md,
    marginTop: 0,
  },
  feedOverline: {
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  /* Map FAB (paid scope) — restore when uncommenting FAB JSX above
  fab: {
    position: 'absolute',
    right: layout.screenPaddingHorizontal,
    width: layout.fab.size,
    height: layout.fab.size,
    borderRadius: layout.fab.size / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    ...shadows.fab,
  },
  fabGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.92 },
  */
});
