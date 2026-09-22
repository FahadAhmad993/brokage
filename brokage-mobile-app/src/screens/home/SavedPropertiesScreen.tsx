import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchProperties } from '../../api/client';
import { PropertyCard } from '../../components/PropertyCard';
import type { HomeStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'SavedProperties'>;

export function SavedPropertiesScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);
  const favoriteIds = useFavoritesStore(s => s.ids);

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['properties', 'all', user?.id],
    queryFn: () => fetchProperties('all', user?.id),
  });

  const saved = useMemo(
    () => all.filter(p => favoriteIds.has(p.id)),
    [all, favoriteIds],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Bookmark color={colors.primary} size={22} strokeWidth={2} />
          <Text style={styles.introTitle}>Saved homes</Text>
          <Text style={styles.introBody}>
            Listings you heart from Discover appear here for quick access.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading saved homes…</Text>
          </View>
        ) : saved.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyBody}>
              Tap the heart on any listing in Discover to save it. Your picks
              sync on this device.
            </Text>
          </View>
        ) : (
          <View style={styles.feed}>
            {saved.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                onPress={() =>
                  navigation.navigate('PropertyDetail', { propertyId: p.id })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const buildStyles = () => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  intro: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  introTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  introBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  empty: {
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  feed: {
    gap: spacing.lg,
  },
});
