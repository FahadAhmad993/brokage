import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Map } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function MapExploreScreen() {
  const navigation = useNavigation();
  return (
    <ScreenScroll>
      <Text style={styles.title}>Map explore</Text>
      <Text style={styles.body}>
        Hook this screen to react-native-maps or your provider. Coordinates can
        mirror listings from your API.
      </Text>
      <View style={styles.mapPlaceholder}>
        <Map color={colors.textMuted} size={40} strokeWidth={iconStroke} />
        <Text style={styles.placeholderLabel}>Map preview</Text>
      </View>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <ChevronLeft
          color={colors.primary}
          size={iconSize.lg}
          strokeWidth={iconStroke}
        />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  mapPlaceholder: {
    height: 280,
    borderRadius: spacing.card,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  placeholderLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
});
