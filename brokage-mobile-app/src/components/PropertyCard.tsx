import { Heart, MapPin, Star } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Property } from '../types/models';
import { colors } from '../theme/colors';
import { iconSize, iconStroke } from '../theme/icons';
import { layout } from '../theme/layout';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useFavoritesStore } from '../stores/favoritesStore';
import { coreStatsSummaryLine } from '../utils/propertyFeatures';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  property: Property;
  onPress: () => void;
};

/** Taller image ratio — hero-style crop common in rental apps. */
const IMAGE_ASPECT = 16 / 11.5;

export function PropertyCard({ property, onPress }: Props) {
  const styles = useThemedStyles(buildStyles);
  const { width: windowWidth } = useWindowDimensions();
  const isFavorite = useFavoritesStore(s => s.ids.has(property.id));
  const toggleFavorite = useFavoritesStore(s => s.toggle);
  /** Card lives inside screen padding; keep overlays from colliding on narrow phones. */
  const imageInnerPad = layout.screenPaddingHorizontal * 2;
  const imageContentWidth = Math.max(0, windowWidth - imageInnerPad);

  const statsLine = useMemo(
    () => coreStatsSummaryLine(property.features),
    [property.features],
  );

  const a11yLabel = useMemo(() => {
    const bits = [property.title, property.location];
    if (statsLine) {
      bits.push(statsLine);
    }
    return bits.join(', ');
  }, [property.title, property.location, statsLine]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        <ImageBackground
          source={{ uri: property.imageUrl }}
          style={[styles.image, { aspectRatio: IMAGE_ASPECT }]}
          imageStyle={styles.imageRadius}
          resizeMode="cover">
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', 'rgba(26,28,29,0.5)']}
            locations={[0.35, 1]}
            style={styles.imageScrim}
          />
          {property.isPremium ? (
            <View
              style={[
                styles.featuredBadge,
                imageContentWidth < 340 && styles.featuredBadgeCompact,
              ]}>
              <Star
                size={11}
                color={colors.accentBrown}
                fill={colors.accentBrown}
                strokeWidth={2}
              />
              <Text style={styles.featuredBadgeText} numberOfLines={1}>
                PREMIUM
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.pricePill,
              imageContentWidth < 360 && styles.pricePillCompact,
            ]}>
            <Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
              ${property.priceMonthly.toLocaleString()}
            </Text>
            <Text style={styles.priceSuffix} numberOfLines={1}>
              /mo
            </Text>
          </View>
          <Pressable
            onPress={() => {
              toggleFavorite(property.id).catch(() => {});
            }}
            style={styles.heartBtn}
            hitSlop={layout.hitSlop}
            accessibilityLabel={
              isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }>
            <Heart
              size={iconSize.md}
              color="#fff"
              fill={isFavorite ? '#fff' : 'transparent'}
              strokeWidth={iconStroke}
            />
          </Pressable>
        </ImageBackground>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {property.title}
        </Text>
        {statsLine ? (
          <Text style={styles.statsLine} numberOfLines={1}>
            {statsLine}
          </Text>
        ) : null}
        <View style={styles.locRow}>
          <MapPin
            size={iconSize.sm}
            color={colors.textMuted}
            strokeWidth={iconStroke}
          />
          <Text style={styles.location} numberOfLines={1} ellipsizeMode="tail">
            {property.location}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const buildStyles = () => StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    marginBottom: 0,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.cardSubtle,
  },
  pressed: { opacity: 0.98 },
  imageWrap: { width: '100%' },
  image: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  imageRadius: {
    borderTopLeftRadius: layout.radius.xl,
    borderTopRightRadius: layout.radius.xl,
  },
  imageScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: layout.radius.full,
    backgroundColor: colors.overlayOnPhoto,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    maxWidth: '48%',
    ...shadows.cardSubtle,
  },
  featuredBadgeCompact: {
    paddingHorizontal: 7,
    maxWidth: '42%',
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: colors.accentBrown,
  },
  pricePill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
    maxWidth: '52%',
    backgroundColor: colors.overlayOnPhoto,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    ...shadows.cardSubtle,
  },
  pricePillCompact: {
    paddingHorizontal: 8,
    maxWidth: '56%',
  },
  priceText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  priceSuffix: {
    fontSize: 11,
    opacity: 0.65,
    marginLeft: 3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  heartBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 10,
    borderRadius: layout.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: layout.minTouchTarget - 8,
    minHeight: layout.minTouchTarget - 8,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 4,
  },
  title: {
    ...typography.headline,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  statsLine: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    marginTop: 1,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  location: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
});
