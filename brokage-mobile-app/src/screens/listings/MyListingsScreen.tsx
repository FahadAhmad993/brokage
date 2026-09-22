import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../components/GradientButton';
import { ManagedListingRow } from '../../components/ManagedListingRow';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import {
  errorMessage,
  fetchMyListings,
  removeMyListing,
  updateMyListingStatus,
} from '../../api/client';
import type { HomeStackParamList } from '../../navigation/types';
import type { ListingStatus } from '../../types/models';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'MyListings'>;

export function MyListingsScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const alert = useAppAlert();
  const toast = useAppToast();
  const user = useAuthStore(s => s.user);

  const { data: listings = [] } = useQuery({
    queryKey: ['my-listings', user?.id],
    queryFn: () => fetchMyListings(),
    enabled: !!user,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ListingStatus }) =>
      updateMyListingStatus(id, status),
    onSuccess: (_data, variables) => {
      syncFeed();
      queryClient.invalidateQueries({ queryKey: ['my-listings', user?.id] });
      toast({
        title: variables.status === 'live' ? 'Listing resumed' : 'Listing paused',
        message:
          variables.status === 'live'
            ? 'Guests can now discover this listing.'
            : 'Hidden from guests until you resume it.',
        kind: 'success',
      });
    },
    onError: error => {
      alert({
        title: 'Could not update listing',
        message: errorMessage(error, 'Please try again in a moment.'),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeMyListing(id),
    onSuccess: () => {
      syncFeed();
      queryClient.invalidateQueries({ queryKey: ['my-listings', user?.id] });
      toast({
        title: 'Listing removed',
        message: 'It is no longer visible to guests.',
        kind: 'success',
      });
    },
    onError: error => {
      alert({
        title: 'Could not remove listing',
        message: errorMessage(error, 'Please try again in a moment.'),
      });
    },
  });

  const syncFeed = () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['property'] });
  };

  const sorted = useMemo(
    () =>
      [...listings].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [listings],
  );

  const live = listings.filter(l => l.status === 'live').length;
  const paused = listings.filter(l => l.status === 'paused').length;

  const listHeader = sorted.length > 0 && (
    <View style={styles.listHead}>
      <Text style={getScreenStyles().sectionOverline}>Host</Text>
      <Text style={styles.screenLead}>Your listings</Text>
      <Text style={styles.screenHint}>
        Open a card to preview on the map. Pause anytime or use More for
        actions.
      </Text>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <View style={[styles.metricDot, styles.metricDotLive]} />
          <Text style={styles.metricVal}>{live}</Text>
          <Text style={styles.metricLabel}>Live</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <View style={[styles.metricDot, styles.metricDotPaused]} />
          <Text style={styles.metricVal}>{paused}</Text>
          <Text style={styles.metricLabel}>Paused</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <View style={[styles.metricDot, styles.metricDotTotal]} />
          <Text style={styles.metricVal}>{listings.length}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        ListHeaderComponent={listHeader || null}
        contentContainerStyle={
          sorted.length === 0 ? styles.emptyList : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Building2
                color={colors.primary}
                size={24}
                strokeWidth={iconStroke}
              />
            </View>
            <Text style={getScreenStyles().sectionOverline}>Host</Text>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyBody}>
              Publish a property to manage availability, status, and visibility
              from this screen.
            </Text>
            <GradientButton
              label="Create listing"
              onPress={() => navigation.navigate('AddProperty')}
              toolbar
            />
          </View>
        }
        renderItem={({ item }) => (
          <ManagedListingRow
            item={item}
            onOpen={() =>
              navigation.navigate('PropertyDetail', { propertyId: item.id })
            }
            onToggleStatus={(next: ListingStatus) => {
              statusMutation.mutate({ id: item.id, status: next });
            }}
            onRemove={() => {
              removeMutation.mutate(item.id);
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      {sorted.length > 0 ? (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.fabSecondary,
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
            onPress={() => navigation.navigate('AddProperty')}
            accessibilityRole="button"
            accessibilityLabel="Add listing">
            <Plus
              color={colors.primary}
              size={iconSize.sm}
              strokeWidth={iconStroke}
            />
            <Text style={styles.fabSecondaryText}>Add listing</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const buildStyles = () => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 40,
  },
  emptyList: { flexGrow: 1 },
  listHead: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  screenLead: {
    ...typography.displayMedium,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  screenHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadows.cardSubtle,
  },
  metric: { flex: 1, alignItems: 'center', gap: 6 },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  metricDotLive: { backgroundColor: colors.success },
  metricDotPaused: { backgroundColor: colors.textTabInactive },
  metricDotTotal: { backgroundColor: colors.primaryMid },
  metricVal: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.label,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.divider,
  },
  empty: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xl,
    gap: spacing.sm,
    alignItems: 'stretch',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.25,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.bodySmall,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  footer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  fabSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fabSecondaryText: {
    ...typography.label,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.05,
  },
  pressed: { opacity: 0.92 },
});
