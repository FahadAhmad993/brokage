import { ExternalLink, MapPin } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ChatLocationRef } from '../../types/models';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  STATIC_MAP_GRID,
  STATIC_MAP_TILE_SIZE,
  buildExternalMapsUrl,
  buildOsmTileUrl,
  buildStaticMapPreview,
  describeLocation,
} from '../../lib/shareLocation';

type Props = {
  location: ChatLocationRef;
  /** When true, render in the message-author color scheme (sender's bubble). */
  mine?: boolean;
};

const PREVIEW_WIDTH = 240;
const GRID_PIXELS = STATIC_MAP_TILE_SIZE * STATIC_MAP_GRID;
/** Scale from OSM's native tile pixels into the rendered preview width so
 *  the pin's absolute coords land on the right spot regardless of bubble size. */
const SCALE = PREVIEW_WIDTH / GRID_PIXELS;
const PREVIEW_HEIGHT = GRID_PIXELS * SCALE;

export function ChatLocationAttachment({ location, mine }: Props) {
  const preview = React.useMemo(
    () => buildStaticMapPreview(location.latitude, location.longitude),
    [location.latitude, location.longitude],
  );
  const [failedTiles, setFailedTiles] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [loadedTiles, setLoadedTiles] = React.useState(0);

  // Reset load state whenever the underlying tile set changes.
  React.useEffect(() => {
    setFailedTiles(new Set());
    setLoadedTiles(0);
  }, [preview]);

  const description = describeLocation(location);

  const openExternal = React.useCallback(() => {
    const url = buildExternalMapsUrl(
      location.latitude,
      location.longitude,
      location.label,
    );
    void Linking.openURL(url);
  }, [location.label, location.latitude, location.longitude]);

  const totalTiles = preview.tiles.length;
  const allTilesFailed = failedTiles.size === totalTiles;
  const loading = !allTilesFailed && loadedTiles < totalTiles;

  return (
    <Pressable
      onPress={openExternal}
      style={({ pressed }) => [
        styles.wrap,
        mine && styles.wrapMine,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Shared location ${description}. Tap to open in Maps.`}>
      <View style={styles.previewWrap}>
        {!allTilesFailed ? (
          <View
            style={[
              styles.tileLayer,
              {
                width: PREVIEW_WIDTH,
                height: PREVIEW_HEIGHT,
              },
            ]}>
            {preview.tiles.map(tile => {
              const key = `${tile.x}:${tile.y}`;
              const col = tile.x - preview.tiles[0].x;
              const row = tile.y - preview.tiles[0].y;
              if (failedTiles.has(key)) {
                return null;
              }
              return (
                <Image
                  key={key}
                  source={{ uri: buildOsmTileUrl(tile, preview.zoom) }}
                  style={[
                    styles.tile,
                    {
                      width: STATIC_MAP_TILE_SIZE * SCALE,
                      height: STATIC_MAP_TILE_SIZE * SCALE,
                      left: col * STATIC_MAP_TILE_SIZE * SCALE,
                      top: row * STATIC_MAP_TILE_SIZE * SCALE,
                    },
                  ]}
                  onLoad={() => setLoadedTiles(n => n + 1)}
                  onError={() => {
                    setFailedTiles(prev => {
                      const next = new Set(prev);
                      next.add(key);
                      return next;
                    });
                    setLoadedTiles(n => n + 1);
                  }}
                  accessibilityIgnoresInvertColors
                />
              );
            })}
            <View
              style={[
                styles.pin,
                {
                  left: preview.pinX * SCALE - 14,
                  top: preview.pinY * SCALE - 28,
                },
              ]}
              pointerEvents="none">
              <MapPin
                color={colors.onPrimary}
                size={iconSize.sm}
                strokeWidth={iconStroke + 0.5}
                fill={colors.primary}
              />
            </View>
            {loading ? (
              <View style={styles.loaderOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.tileLayer,
              styles.previewFallback,
              { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT },
            ]}>
            <MapPin
              color={colors.primary}
              size={iconSize.lg}
              strokeWidth={iconStroke}
            />
            <Text style={styles.previewFallbackText}>
              Map preview unavailable
            </Text>
            <Text style={styles.previewFallbackHint}>
              Tap to open in Maps
            </Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <View style={styles.footerText}>
          <Text style={styles.label} numberOfLines={2}>
            {description}
          </Text>
          <Text style={styles.hint}>Tap to open in Maps</Text>
        </View>
        <ExternalLink
          color={colors.textMuted}
          size={iconSize.sm}
          strokeWidth={iconStroke}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: PREVIEW_WIDTH,
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.cardSubtle,
  },
  wrapMine: {
    backgroundColor: colors.surface,
    borderColor: colors.primarySoft,
  },
  pressed: { opacity: 0.92 },
  previewWrap: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  tileLayer: {
    position: 'relative',
  },
  tile: {
    position: 'absolute',
    backgroundColor: colors.surfaceMuted,
  },
  previewFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  previewFallbackText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  previewFallbackHint: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  footerText: { flex: 1, gap: 2, minWidth: 0 },
  label: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
