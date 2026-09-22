import { ChevronRight, ImageIcon } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChatListingRef } from '../../types/models';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Props = {
  listing: ChatListingRef;
  onPress?: () => void;
  /** Slightly tighter when embedded in a message bubble. */
  compact?: boolean;
};

export function ChatListingAttachment({
  listing,
  onPress,
  compact,
}: Props) {
  const styles = useThemedStyles(buildStyles);
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => {
    setImageFailed(false);
  }, [listing.id, listing.imageUrl]);
  const showImage = Boolean(listing.imageUrl?.trim()) && !imageFailed;

  const inner = (
    <>
      {showImage ? (
        <Image
          source={{ uri: listing.imageUrl }}
          style={styles.thumb}
          onError={() => setImageFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={[styles.thumb, styles.thumbPlaceholder]}
          accessibilityLabel="No listing photo">
          <ImageIcon
            color={colors.textMuted}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.eyebrow}>Listing</Text>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.loc} numberOfLines={1}>
          {listing.location}
        </Text>
        <Text style={styles.price}>
          ${listing.priceMonthly.toLocaleString()}
          <Text style={styles.per}>/mo</Text>
        </Text>
      </View>
      {onPress ? (
        <ChevronRight
          color={colors.textMuted}
          size={iconSize.sm}
          strokeWidth={iconStroke}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrap,
          compact && styles.wrapCompact,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open listing ${listing.title}`}>
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>{inner}</View>
  );
}

const buildStyles = () => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  wrapCompact: {
    marginTop: spacing.xs,
    padding: spacing.xs + 2,
  },
  pressed: { opacity: 0.92 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: layout.radius.sm,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.headline,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  loc: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textMuted,
  },
  price: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  per: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
