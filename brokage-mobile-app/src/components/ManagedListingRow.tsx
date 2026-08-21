import { Eye, MoreHorizontal, Pause, Play } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppAlert } from './appAlert';
import type { ListingStatus, ManagedListing } from '../types/models';
import { colors } from '../theme/colors';
import { iconSize, iconStroke } from '../theme/icons';
import { layout } from '../theme/layout';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  item: ManagedListing;
  onOpen: () => void;
  onToggleStatus: (next: ListingStatus) => void;
  onRemove: () => void;
};

export function ManagedListingRow({
  item,
  onOpen,
  onToggleStatus,
  onRemove,
}: Props) {
  const alert = useAppAlert();
  const statusLabel = item.status === 'live' ? 'Live' : 'Paused';

  const menu = () => {
    alert({
      title: item.title,
      message: 'Choose an action',
      variant: 'actionSheet',
      buttons: [
        { text: 'View listing', onPress: onOpen },
        {
          text: item.status === 'live' ? 'Pause listing' : 'Resume listing',
          onPress: () =>
            onToggleStatus(item.status === 'live' ? 'paused' : 'live'),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            alert({
              title: 'Remove listing?',
              message: 'Guests will no longer see this listing.',
              buttons: [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: onRemove },
              ],
            }),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        style={styles.mainRow}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${statusLabel}`}>
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <View
              style={[
                styles.badge,
                item.status === 'paused' && styles.badgePaused,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  item.status === 'paused' && styles.badgeTextPaused,
                ]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.loc} numberOfLines={1}>
            {item.location}
          </Text>
          <Text style={styles.price}>
            ${item.priceMonthly.toLocaleString()}
            <Text style={styles.per}>/mo</Text>
          </Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          onPress={onOpen}
          accessibilityLabel="View listing">
          <Eye
            color={colors.primary}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          onPress={() =>
            onToggleStatus(item.status === 'live' ? 'paused' : 'live')
          }
          accessibilityLabel={
            item.status === 'live' ? 'Pause listing' : 'Resume listing'
          }>
          {item.status === 'live' ? (
            <Pause
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
          ) : (
            <Play
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          onPress={menu}
          accessibilityLabel="More options">
          <MoreHorizontal
            color={colors.textMuted}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.cardSubtle,
  },
  mainRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: layout.radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  meta: { flex: 1, gap: 6, justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePaused: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  badgeTextPaused: {
    color: colors.textSecondary,
  },
  loc: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  price: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  per: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.88 },
});
